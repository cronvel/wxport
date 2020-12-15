/*
	WXport

	Copyright (c) 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const bent = require( 'bent' ) ;
const httpGetString = bent( 'string' ) ;

const cheerio = require( 'cheerio' ) ;
const Promise = require( 'seventh' ) ;

const url = require( 'url' ) ;
const path = require( 'path' ) ;

const Schema = require( './Schema.js' ) ;
const Expression = require( './Expression.js' ) ;

const ALLOWED_PROTOCOL = new Set( [ 'http' , 'https' ] ) ;



function WXport( urls , options = {} ) {
	this.urls =
		urls instanceof Set ? urls :
		Array.isArray( urls ) ? new Set( urls ) :
		new Set( [ urls ] ) ;

	this.concurrency = options.concurrency || 4 ;
	this.followLinks = options.followLinks === undefined ? true : !! options.followLinks ;
	this.crossDomain = !! options.crossDomain ;		// Follow links to other domain
	this.schemas = Array.isArray( options.schemas )  ?  options.schemas.map( e => new Schema( e ) )  :  [ new Schema( options.schemas ) ] ;
	//console.log( "new WXport" , options , this.schemas[ 0 ] ) ;
}

module.exports = WXport ;

WXport.Schema = Schema ;
WXport.Expression = Expression ;



WXport.prototype.get = async function( urlStr ) {
	var html , $ , schema , output , key , value ;

	html = await httpGetString( urlStr ) ;

	//console.log( html ) ;
	$ = cheerio.load( html ) ;

	if ( this.followLinks ) { this.addLinkedUrls( $ , urlStr ) ; }

	// Find the correct schema
	schema = this.schemas.find( s => s.isMatching( urlStr , $ ) ) ;
	//console.log( "Matching:" , schema ) ;

	return schema ? schema.populateValues( $ , urlStr ) : undefined ;
} ;



WXport.prototype.addLinkedUrls = function( $ , fromUrl ) {
	var fromParsedUrl = url.parse( fromUrl ) ;

	$( 'a' ).each( ( index , element ) => {
		var urlStr = $( element ).attr( 'href' ) ;
		if ( ! urlStr ) { return ; }

		console.log( "Found URL:" , urlStr ) ;

		var parsedUrl = url.parse( urlStr ) ;

		if ( parsedUrl.protocol && ! ALLOWED_PROTOCOL.has( parsedUrl.protocol.slice( 0 , - 1 ) ) ) {
			console.log( "  > Unsupported protocol:" , urlStr ) ;
			return ;
		}
		
		if ( ! parsedUrl.host && ! parsedUrl.hostname ) {
			// The domain part is missing, we will use all the non-path parts
			parsedUrl.protocol = fromParsedUrl.protocol ;
			parsedUrl.host = fromParsedUrl.host ;
			parsedUrl.hostname = fromParsedUrl.hostname ;
			parsedUrl.auth = fromParsedUrl.auth ;
		}

		if ( ! parsedUrl.pathname ) {
			// No pathname, copy it, we probably want a query string on the same path
			parsedUrl.pathname = fromParsedUrl.pathname ;
		}
		else if ( parsedUrl.pathname[ 0 ] !== '/' ) {
			// The path is not absolute, we have to join it to the current path
			parsedUrl.pathname = path.join( fromParsedUrl.pathname , parsedUrl.pathname ) ;
		}
		
		parsedUrl.hash = null ;
		urlStr = parsedUrl.format() ;
		
		if ( ! this.crossDomain && fromParsedUrl.hostname !== parsedUrl.hostname ) {
			console.log( "  > Cross domain not allowed:" , urlStr ) ;
			return ;
		}

		if ( this.urls.has( urlStr ) ) {
			console.log( "  > URL already known:" , urlStr ) ;
			return ;
		}

		console.log( "  > New URL:" , urlStr ) ;
		this.urls.add( urlStr ) ;
	} ) ;
} ;

