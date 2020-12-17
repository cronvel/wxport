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



const transformFunctions = require( './transformFunctions.js' ) ;



function Expression() {
	this.selector = '' ;
	this.transforms = [] ;
}

module.exports = Expression ;



Expression.prototype.apply = function( $ , customTransformFunctions = null ) {
	//console.log( "apply" , this.selector , $( this.selector ).text() ) ;
	var transformObject , fn ,
		current = $( this.selector ) ;

	// If the selector match nothing, we simply discard, we do not attempt to apply transforms
	if ( ! current.toArray().length ) { return ; }

	if ( ! this.transforms.length ) { return current.text() ; }

	for ( transformObject of this.transforms ) {
		fn = transformFunctions[ transformObject.fn ] ? transformFunctions[ transformObject.fn ] :
			customTransformFunctions && customTransformFunctions[ transformObject.fn ] ? customTransformFunctions[ transformObject.fn ] :
			null ;

		try {
			current = fn( current , ... transformObject.args ) ;
		}
		catch ( error ) {
			console.log( "Transform '" + transformObject.fn + "' failed with error: " + error ) ;
			return null ;
		}
	}

	return current ;
} ;



Expression.parse = function( str ) {
	// First, check if this is a static string, starting with a double pipe "||"
	if ( str[ 0 ] === '|' && str[ 1 ] === '|' ) { return str.slice( 2 ) ; }

	var runtime = {
		str ,
		i: str.indexOf( '|' ) ,
		expression: new Expression()
	} ;

	if ( runtime.i === -1 ) {
		runtime.expression.selector = str.trim() ;
	}
	else {
		runtime.expression.selector = str.slice( 0 , runtime.i ).trim() ;
		parseTransform( runtime ) ;
	}

	return runtime.expression ;
} ;



function parseTransform( runtime ) {
	var oneTransform ;

	while ( runtime.i < runtime.str.length && runtime.str[ runtime.i ] === '|' ) {
		runtime.i ++ ;
		parseSpaces( runtime ) ;

		oneTransform = { fn: null , args: [] } ;
		runtime.expression.transforms.push( oneTransform ) ;

		oneTransform.fn = parseIdentifier( runtime ) ;
		parseSpaces( runtime ) ;

		if ( runtime.str[ runtime.i ] === '(' ) {
			runtime.i ++ ;

			for ( ;; ) {
				parseSpaces( runtime ) ;
				oneTransform.args.push( parseArgument( runtime ) ) ;
				parseSpaces( runtime ) ;

				if ( runtime.str[ runtime.i ] === ')' ) { runtime.i ++ ; break ; }
				if ( runtime.str[ runtime.i ] === ',' ) { runtime.i ++ ; continue ; }
				return parseError( runtime ) ;
			}

			parseSpaces( runtime ) ;
		}
	}

	// Dang! there are extra chars that we don't how to deal with
	if ( runtime.i < runtime.str.length ) { return parseError( runtime ) ; }
}



function parseIdentifier( runtime ) {
	var c , v ,
		j = runtime.i ,
		l = runtime.str.length ;

	for ( ; j < l ; j ++ ) {
		c = runtime.str.charCodeAt( j ) ;

		// Number (not first char) or letter or underscore or hyphen or $
		if ( ! (
			( c >= 0x30 && c <= 0x39 && j !== runtime.i )
			|| ( c >= 0x41 && c <= 0x5a )
			|| ( c >= 0x61 && c <= 0x7a )
			|| c === 0x5f
			|| c === 0x2d
			|| c === 0x24
		) ) {
			break ;
		}
	}

	v = runtime.str.slice( runtime.i , j ) ;
	runtime.i = j ;
	return v ;
}



function parseArgument( runtime ) {
	if ( runtime.i >= runtime.str.length ) { return parseError( runtime ) ; }

	var v , c = runtime.str.charCodeAt( runtime.i ) ;

	if ( ( c >= 0x30 && c <= 0x39 ) || c === 0x2d ) {	// digit
		return parseNumber( runtime ) ;
	}

	if ( c === 0x22 ) {		// "   double-quote: this is a string
		runtime.i ++ ;
		return parseQuotedString( runtime ) ;
	}

	if ( c === 0x27 ) {		// '   double-quote: this is a string
		runtime.i ++ ;
		return parseQuotedString( runtime , true ) ;
	}

	// Letter or underscore or hyphen: unquoted string, with only letter, underscore or hyphen or $
	if ( ( c >= 0x41 && c <= 0x5a ) || ( c >= 0x61 && c <= 0x7a ) || c === 0x5f || c === 0x2d || c === 0x24 ) {
		v = parseIdentifier( runtime ) ;
		if ( v === 'true' ) { return true ; }
		if ( v === 'false' ) { return false ; }
		if ( v === 'null' ) { return null ; }
		if ( v === 'undefined' ) { return undefined ; }
		return v ;
	}

	return parseError( runtime ) ;
}



function parseQuotedString( runtime , isSingleQuote = false ) {
	var c , j = runtime.i , v = '' ,
		l = runtime.str.length ;

	for ( ; j < l ; j ++ ) {
		c = runtime.str.charCodeAt( j ) ;

		if ( c === 0x22	&& ! isSingleQuote ) {		// double quote = end of the string
			v += runtime.str.slice( runtime.i , j ) ;
			runtime.i = j + 1 ;
			return v ;
		}
		else if ( c === 0x27 && isSingleQuote ) {		// single quote = end of the string
			v += runtime.str.slice( runtime.i , j ) ;
			runtime.i = j + 1 ;
			return v ;
		}
		else if ( c === 0x5c ) {	// backslash
			v += runtime.str.slice( runtime.i , j ) ;
			runtime.i = j + 1 ;
			v += parseBackSlash( runtime ) ;
			j = runtime.i - 1 ;
		}
		else if ( c <= 0x1f ) {		// illegal
			runtime.i = j ;
			return parseError( runtime ) ;
		}
	}

	runtime.i = j ;
	return parseError( runtime ) ;
}



const parseBackSlashLookup =
( function() {
	var c = 0 , lookup = new Array( 0x80 ) ;

	for ( ; c < 0x80 ; c ++ ) {
		if ( c === 0x62 ) { // b
			lookup[ c ] = '\b' ;
		}
		else if ( c === 0x66 ) { // f
			lookup[ c ] = '\f' ;
		}
		else if ( c === 0x6e ) { // n
			lookup[ c ] = '\n' ;
		}
		else if ( c === 0x72 ) { // r
			lookup[ c ] = '\r' ;
		}
		else if ( c === 0x74 ) { // t
			lookup[ c ] = '\t' ;
		}
		else if ( c === 0x5c ) { // backslash
			lookup[ c ] = '\\' ;
		}
		else if ( c === 0x2f ) { // slash
			lookup[ c ] = '/' ;
		}
		else if ( c === 0x22 ) { // double-quote
			lookup[ c ] = '"' ;
		}
		else {
			lookup[ c ] = '' ;
		}
	}

	return lookup ;
} )() ;



function parseBackSlash( runtime ) {
	var v , c = runtime.str.charCodeAt( runtime.i ) ;

	if ( runtime.i >= runtime.str.length ) { return parseError( runtime ) ; }

	if ( c === 0x75 ) { // u
		runtime.i ++ ;
		v = parseUnicode( runtime ) ;
		return v ;
	}
	else if ( ( v = parseBackSlashLookup[ c ] ).length ) {
		runtime.i ++ ;
		return v ;
	}

	return parseError( runtime ) ;
}



function parseUnicode( runtime ) {
	if ( runtime.i + 3 >= runtime.str.length ) { runtime.i += 3 ; return parseError( runtime ) ; }

	var match = runtime.str.slice( runtime.i , runtime.i + 4 ).match( /[0-9a-f]{4}/ ) ;

	if ( ! match ) { return parseError( runtime ) ; }

	runtime.i += 4 ;

	// Or String.fromCodePoint() ?
	return String.fromCharCode( Number.parseInt( match[ 0 ] , 16 ) ) ;
}



const numberRegexp = /^(-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/ ;

function parseNumber( runtime ) {
	var part = runtime.str.slice( runtime.i ) ;

	// Is this needed?
	numberRegexp.lastIndex = 0 ;

	var matches = part.match( numberRegexp ) ;

	if ( matches && matches[ 1 ] ) {
		runtime.i += matches[ 1 ].length ;
		return parseFloat( part ) ;
	}

	return parseError( runtime ) ;
}



// Skip spaces
function parseSpaces( runtime ) {
	while ( runtime.i < runtime.str.length && runtime.str[ runtime.i ] === ' ' ) { runtime.i ++ ; }
}



// Throw useful error
function parseError( runtime ) {
	if ( runtime.i >= runtime.str.length ) {
		throw SyntaxError( "Parse error, unexpected end of expression: " + runtime.str ) ;
	}

	var c = runtime.str.charCodeAt( runtime.i ) ;

	if ( c <= 0x1f ) {
		throw SyntaxError( "Parse error, unexpected control char 0x" + c.toString( 16 ) + " at " + runtime.i + " in expression: " + runtime.str ) ;
	}
	else {
		throw SyntaxError( "Parse error, unexpected '" + runtime.str[ runtime.i ] + "' at " + runtime.i + " in expression: " + runtime.str ) ;
	}
}

