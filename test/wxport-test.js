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



const WXport = require( '..' ) ;
const Expression = WXport.Expression ;
const Schema = WXport.Schema ;



describe( "Expression parser" , () => {
	it( "Parse a selector-only expression" , () => {
		var expression ;

		expression = Expression.parse( "h1" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'h1', transform: [] } ) ;

		expression = Expression.parse( "   h1   " ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'h1', transform: [] } ) ;

		expression = Expression.parse( "div.content h1" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [] } ) ;
	} ) ;

	it( "Parse an expression with a transform without argument" , () => {
		var expression ;

		expression = Expression.parse( "h1 | toLowerCase" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'h1', transform: [ { fn: "toLowerCase" , args: [] } ] } ) ;

		expression = Expression.parse( "   h1   |  toLowerCase  " ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'h1', transform: [ { fn: "toLowerCase" , args: [] } ] } ) ;

		expression = Expression.parse( "div.content h1 | toLowerCase" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "toLowerCase" , args: [] } ] } ) ;

		expect( () => Expression.parse( "div.content h1 | toLowerCase trash" ) ).to.throw.a( SyntaxError ) ;

		// Transform function allowed characters
		expression = Expression.parse( "div.content h1 | some-func_name2" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "some-func_name2" , args: [] } ] } ) ;

		expect( () => Expression.parse( "div.content h1 | 2bad" ) ).to.throw.a( SyntaxError ) ;
	} ) ;

	it( "Parse an expression with a transform with one argument" , () => {
		var expression ;

		// Using single quote
		expression = Expression.parse( "div.content h1 | attr( 'src' )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "attr" , args: [ 'src' ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | attr('src')" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "attr" , args: [ 'src' ] } ] } ) ;

		// Using double quote
		expression = Expression.parse( 'div.content h1 | attr( "src" )' ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "attr" , args: [ 'src' ] } ] } ) ;
		expression = Expression.parse( 'div.content h1 | attr("src")' ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "attr" , args: [ 'src' ] } ] } ) ;

		// Unquoted
		expression = Expression.parse( "div.content h1 | attr( src )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "attr" , args: [ 'src' ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | attr(src)" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "attr" , args: [ 'src' ] } ] } ) ;

		// number
		expression = Expression.parse( "div.content h1 | someFunc( 123 )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 123 ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | someFunc( -123 )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ -123 ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | someFunc( -123.456 )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ -123.456 ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | someFunc( 0.123 )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 0.123 ] } ] } ) ;

		// constant
		expression = Expression.parse( "div.content h1 | someFunc( true )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ true ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | someFunc( false )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ false ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | someFunc( null )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ null ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | someFunc( undefined )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ undefined ] } ] } ) ;
	} ) ;

	it( "Parse an expression with a transform with multiple arguments" , () => {
		var expression ;

		// Using single quote
		expression = Expression.parse( "div.content h1 | someFunc( 'arg1' , 'arg2' )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 'arg1' , 'arg2' ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | someFunc('arg1','arg2')" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 'arg1' , 'arg2' ] } ] } ) ;

		// Using double quote
		expression = Expression.parse( 'div.content h1 | someFunc( "arg1" , "arg2" )' ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 'arg1' , 'arg2' ] } ] } ) ;
		expression = Expression.parse( 'div.content h1 | someFunc("arg1","arg2")' ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 'arg1' , 'arg2' ] } ] } ) ;

		// Unquoted
		expression = Expression.parse( "div.content h1 | someFunc( arg1 , arg2 )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 'arg1' , 'arg2' ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | someFunc(arg1,arg2)" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 'arg1' , 'arg2' ] } ] } ) ;

		// Using mixed quotes
		expression = Expression.parse( "div.content h1 | someFunc(  'arg1' , \"arg2\" ,  arg3  )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 'arg1' , 'arg2' , 'arg3' ] } ] } ) ;
		expression = Expression.parse( "div.content h1 | someFunc('arg1',\"arg2\",arg3)" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 'arg1' , 'arg2' , 'arg3' ] } ] } ) ;

		// Using mixed type of arguments
		expression = Expression.parse( "div.content h1 | someFunc(  'arg1' , \"arg2\" , true , 123.456 ,  arg3 , null , -0.123 )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [ { fn: "someFunc" , args: [ 'arg1' , 'arg2' , true , 123.456 , 'arg3' , null , -0.123 ] } ] } ) ;
	} ) ;

	it( "Parse an expression with multiple transforms with multiple arguments" , () => {
		var expression ;

		// Using mixed type of arguments
		expression = Expression.parse( "div.content h1 | someFunc(  'arg1' , \"arg2\" , true ) | someOtherFunc( 123.456 ,  arg3 , null , -0.123 )" ) ;
		expect( expression ).to.be.an( Expression ) ;
		expect( expression ).to.be.like( { selector: 'div.content h1', transform: [
			{ fn: "someFunc" , args: [ 'arg1' , 'arg2' , true ] } ,
			{ fn: "someOtherFunc" , args: [ 123.456 , 'arg3' , null , -0.123 ] }
		] } ) ;
	} ) ;
} ) ;

