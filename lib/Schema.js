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



const cheerio = require( 'cheerio' ) ;
const Expression = require( './Expression.js' ) ;



function Schema( options = {} ) {
	//console.log( "new Schema" , options ) ;
	this.matchPageUrl = options.matchPageUrl || null ;
	this.matchPageSelector = options.matchPageSelector || null ;
	this.keys = {} ;

	if ( options.keys && typeof options.keys === 'object' ) {
		for ( let key in options.keys ) {
			//if ( key[ 0 ] === '$' ) {
			if ( true ) {
				this.keys[ key ] = Expression.parse( options.keys[ key ] ) ;
			}
			else {
				this.keys[ key ] = options.keys[ key ] ;
			}
		}
	}
}

module.exports = Schema ;



// $ is a cheerio object
Schema.prototype.isMatching = function( url , $ ) {
	if ( this.matchPageUrl && this.matchPageUrl !== '**' && ! minimatch( url , this.matchPageUrl ) ) {
		return false ;
	}

	if (
		this.matchPageSelector && (
			( Array.isArray( this.matchPageSelector ) && this.matchPageSelector.some( selector => ! $( selector ).toArray().length ) )
			|| ! $( this.matchPageSelector ).toArray().length
		)
	) {
		return false ;
	}

	return true ;
} ;

