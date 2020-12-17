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



const minimatch = require( 'minimatch' ) ;
const Expression = require( './Expression.js' ) ;



function Schema( options = {} ) {
	//console.log( "new Schema" , options ) ;
	this.matchPageUrl = options.matchPageUrl || null ;
	this.matchPageSelector = options.matchPageSelector || null ;
	this.keys = {} ;

	if ( options.keys && typeof options.keys === 'object' ) { this.populateSchemaKeys( options.keys ) ; }
}

module.exports = Schema ;



Schema.prototype.populateSchemaKeys = function( keys , ptr = this.keys ) {
	var key ;

	for ( key in keys ) {
		if ( keys[ key ] && typeof keys[ key ] === 'object' ) {
			ptr[ key ] = {} ;
			this.populateSchemaKeys( keys[ key ] , ptr[ key ] ) ;
		}
		else if ( typeof keys[ key ] === 'string' ) {
			ptr[ key ] = Expression.parse( keys[ key ] ) ;
		}
		else {
			ptr[ key ] = keys[ key ] ;
		}
	}
} ;



// Produce values for the output
Schema.prototype.populateValues = function( $ , urlStr , customTransformFunctions = null , output = {} , ptr = this.keys ) {
	var key ;

	for ( key in ptr ) {
		if ( ptr[ key ] && typeof ptr[ key ] === 'object' ) {
			if ( ptr[ key ] instanceof Expression ) {
				// Dynamic, using an expression
				output[ key ] = ptr[ key ].apply( $ , customTransformFunctions ) ;
			}
			else {
				output[ key ] = {} ;
				this.populateValues( $ , urlStr , customTransformFunctions , output[ key ] , ptr[ key ] ) ;
			}
		}
		else if ( typeof ptr[ key ] === 'function' ) {
			// Dynamic, using a custom function
			output[ key ] = ptr[ key ]( $ , urlStr ) ;
		}
		else {
			// Anything else is static
			output[ key ] = ptr[ key ] ;
		}
	}

	return output ;
} ;



// $ is a cheerio object
Schema.prototype.isMatching = function( urlStr , $ ) {
	return this.isUrlMatching( urlStr ) && this.isContentMatching( $ ) ;
} ;



// At least one glob must match
Schema.prototype.isUrlMatching = function( urlStr ) {
	return ! this.matchPageUrl || this.matchPageUrl === '**' || (
		Array.isArray( this.matchPageUrl ) ?
			this.matchPageUrl.some( glob => minimatch( urlStr , glob ) ) :
			minimatch( urlStr , this.matchPageUrl )
	) ;
} ;



// $ is a cheerio object
// All selectors MUST match
Schema.prototype.isContentMatching = function( $ ) {
	return ! this.matchPageSelector || (
		Array.isArray( this.matchPageSelector ) ?
			this.matchPageSelector.every( selector => $( selector ).toArray().length ) :
			$( this.matchPageSelector ).toArray().length
	) ;
} ;

