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



function Expression() {
	this.selector = '' ;
	this.transform = [] ;
}

module.exports = Expression ;



Expression.parse = function( str ) {
	var expression = new Expression() ,
		runtime = {
			str ,
			i: str.indexOf( '|' )
		} ;

	if ( i === -1 ) {
		this.selector = str ;
	}
	else {
		this.selector = str.slice( 0 , runtime.i ) ;
		runtime.i ++ ;
		while ( runtime.i < str.length ) { parseTransform( runtime ) ; }
	}

	return expression ;
} ;



function parseTransform( runtime ) {
	parseIdentifier( runtime ) ;
		else if ( c === 0x28 ) {	// parens
}



function parseIdentifier( runtime ) {
	var c , j = runtime.i , l = runtime.str.length , v = '' ;

	for ( ; j < l ; j ++ ) {
		c = str.charCodeAt( j ) ;
		if ( ( c >= 0x41 && c <= 0x5a ) || ( c >= 0x61 && c <= 0x7a ) ) {
			
		}
		else {
			
		}
	}
	
	return ;
}

