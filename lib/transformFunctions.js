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



function typeError( name , expected , input ) {
	var got , cName , expectedA = 'a' , gotA = 'a' ;

	if ( input && typeof input === 'object' ) {
		cName = Object.getPrototypeOf( input ).constructor.name ;
		if ( cName ) { got = 'instance of ' + cName ; }
		else { got = 'object' ; }
	}
	else {
		got = typeof input ;
	}

	if ( expected[ 0 ].match( /[aeiouyAEIOUY]/ ) ) { expectedA = 'an' ; }
	if ( got[ 0 ].match( /[aeiouyAEIOUY]/ ) ) { gotA = 'an' ; }

	console.log( "Error input: " , input ) ;
	throw TypeError( "Transform '" + name + "' expected " + expectedA + ' ' + expected + " but got " + gotA + ' ' + got ) ;
}



// jQuery/cheerio transform
[
	'text' , 'html' , 'attr' , 'toArray'
].forEach( name => exports[ name ] = ( input , ... args ) => {
	if ( Array.isArray( input ) ) { return input.map( e => exports[ name ]( e , ... args ) ) ; }
	if ( ! ( input instanceof cheerio ) ) { return typeError( name , 'cheerio object' , input ) ; }
	return input[ name ]( ... args ) ;
} ) ;



exports.to$Array = input => {
	if ( ! ( input instanceof cheerio ) ) { return typeError( name , 'cheerio object' , input ) ; }
	return input.toArray().map( e => cheerio( e ) ) ;
} ;



// String.prototype transform
[
	'padEnd' , 'padStart' , 'repeat' , 'slice' , 'split' , 'substring' ,
	'toLowerCase' , 'toUpperCase' , 'toLocaleLowerCase' , 'toLocaleUpperCase' ,
	'trim' , 'trimEnd' , 'trimStart'
].forEach( name => exports[ name ] = ( input , ... args ) => {
	if ( input instanceof cheerio ) {
		//input = input.toArray() ;
		input = input.text() ;
	}

	if ( Array.isArray( input ) ) { return input.map( e => exports[ name ]( e , ... args ) ) ; }
	if ( typeof input !== 'string' ) { return typeError( name , 'string' , input ) ; }
	return input[ name ]( ... args ) ;
} ) ;



// Array.prototype transform
[
	'join' ,
	'slice' , 'splice'
].forEach( name => exports[ name ] = ( input , ... args ) => {
	if ( input instanceof cheerio ) { input = input.toArray() ; }
	if ( ! Array.isArray( input ) ) { return typeError( name , 'array' , input ) ; }
	return input[ name ]( ... args ) ;
} ) ;

