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

const Schema = require( './Schema.js' ) ;
const Expression = require( './Expression.js' ) ;



function WXport( urls , options = {} ) {
	this.urls = Array.isArray( urls ) ? urls : [ urls ] ;
	this.concurrency = options.concurrency || 4 ;
	this.followLinks = options.followLinks === undefined ? true : !! options.followLinks ;
	this.crossDomain = !! options.crossDomain ;		// Follow links to other domain
	this.schemas = Array.isArray( options.schemas )  ?  options.schemas.map( e => new Schema( e ) )  :  [ new Schema( options.schemas ) ] ;
	//console.log( "new WXport" , options , this.schemas[ 0 ] ) ;
}

module.exports = WXport ;

WXport.Schema = Schema ;
WXport.Expression = Expression ;



WXport.prototype.get = async function( url ) {
	var html , $ , schema , output , key , value ;

	html = await httpGetString( url ) ;

	//console.log( html ) ;
	$ = cheerio.load( html ) ;



	// /!\ First, we have to find links if followLinks is on



	// Find the correct schema
	schema = this.schemas.find( s => s.isMatching( url , $ ) ) ;
	//console.log( "Matching:" , schema ) ;

	if ( ! schema ) { return ; }

	output = {} ;

	for ( key in schema.keys ) {
		value = schema.keys[ key ] ;

		//if ( key[ 0 ] === '$' ) {
		if ( true ) {
			// It's dynamic
			if ( value === 'function' ) {
				output[ key ] = value( $ , url ) ;
			}
			else if ( value instanceof Expression ) {
				output[ key ] = value.apply( $ ) ;
			}
		}
		else {
			// It's static
			output[ key ] = value ;
		}
	}

	return output ;
} ;

