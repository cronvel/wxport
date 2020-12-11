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
const doormen = require( 'doormen' ) ;
const minimatch = require( 'minimatch' ) ;	// for URL matching
const Promise = require( 'seventh' ) ;



function WXport( urls , options = {} ) {
	this.urls = Array.isArray( urls ) ? urls : [ urls ] ;
	this.concurrency = options.concurrency || 4 ;
	this.followLinks = options.followLinks === undefined ? true : !! options.followLinks ;
	this.crossDomain = !! options.crossDomain ;		// Follow links to other domain
	this.schemas = Array.isArray( schemas ) ? schemas.map( e => new Schema( e ) : new Schema( schemas ) ) ;

	this.export = {} ;
}

module.exports = WXport ;



function Schema( options ) {
	this.matchPageUrl = options.matchPageUrl || '*' ;
	this.matchPageSelector = options.matchPageSelector || null ;
	this.keys = {} ;
	
	if ( options.keys && typeof options.keys === 'object' ) {
		for ( key in options.key ) {
			this.keys[ key ] = new 
		}
	}
}

WXport.Schema = Schema ;



WXport.prototype.get = async function( url ) {
	var html , collection , exportElements , exportElement , elementSelector ;
	
	html = await httpGetString( url ) ;

	//console.log( html ) ;
	const $ = cheerio.load( html ) ;
	
	for ( let cName in this.schema.collections ) {
		collection = this.schema.collections[ cName ] ;
		exportElements = this.export[ cName ] = [] ;
		elementSelector = collection.element ;

		$( elementSelector ).each( ( index , domElement ) => {
			exportElements.push( exportElement = {} ) ;
			for ( let pName in collection.properties ) {
				let property = collection.properties[ pName ] ;
				let value = $( domElement ).find( property.selector ).text() ;

				if ( property.sanitize ) {
					if ( this.schema.sanitizers && this.schema.sanitizers[ property.sanitize ] ) {
						value = this.schema.sanitizers[ property.sanitize ]( value ) ;
					}
					else if ( doormen.sanitizers[ property.sanitize ] ) {
						value = doormen.sanitizers[ property.sanitize ]( value ) ;
					}
				}

				//console.log( "prop: " , pName , value ) ;
				exportElement[ pName ] = value ;
			}
		} ) ;
	}
	
	/*
	console.log( $( '.inner_product h2' ).html() ) ;
	
	console.log( "find:" , $( '.inner_product h2' )[ 0 ] ) ;
	//return ;
	$( '.inner_product h2' ).each( ( i , $e ) => console.log( $( $e ).text() ) ) ;
	return ;
	for ( let $h2 of $( '.inner_product h2' )[ 0 ] ) {
		console.log( $h2.html() ) ;
	}
	//*/
} ;

