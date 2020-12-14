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

const Schema = require( './Schema.js' ) ;



function WXport( urls , options = {} ) {
	this.urls = Array.isArray( urls ) ? urls : [ urls ] ;
	this.concurrency = options.concurrency || 4 ;
	this.followLinks = options.followLinks === undefined ? true : !! options.followLinks ;
	this.crossDomain = !! options.crossDomain ;		// Follow links to other domain
	this.schemas = Array.isArray( options.schemas )  ?  options.schemas.map( e => new Schema( e ) )  :  new Schema( options.schemas ) ;

	this.export = {} ;
}

module.exports = WXport ;

WXport.Schema = Schema ;
WXport.Expression = require( './Expression.js' ) ;



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
			var property , node , value ;

			exportElements.push( exportElement = {} ) ;

			for ( let pName in collection.properties ) {
				property = collection.properties[ pName ] ;
				node = $( domElement ).find( property.selector ) ;

				switch ( property.extract ) {
					case 'attr' :
					case 'attribute' :
						value = node.attr( property.name ) ;
						break ;
					default :
						value = node.text() ;
				}

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
} ;

