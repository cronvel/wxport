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



const WXport = require( './WXport.js' ) ;
const kungFig = require( 'kung-fig' ) ;

const fs = require( 'fs' ).promises ;
const path = require( 'path' ) ;

const termkit = require( 'terminal-kit' ) ;
const term = termkit.terminal ;
const cliManager = require( 'utterminal' ).cli ;
const package_ = require( '../package.json' ) ;



async function cli() {
	/* eslint-disable indent */
	cliManager.package( package_ )
		.app( 'WXport' )
		.description( "Export from the web to a structured to JSON." )
		//.usage( "[--option1] [--option2] [...]" )
		//.introIfTTY
		//.helpOption
		.commonOptions
		.camel
		.arg( 'schema' ).string.mandatory
			.typeLabel( 'file' )
			.description( "The schema file (JSON or KFG format)" )
		.restArgs( 'urls' ).string.mandatory
			.typeLabel( 'URL' )
			.description( "The URLs to scap" )
		.opt( [ 'output' , 'o' ] )
			.typeLabel( 'file' )
			.description( "The output file (output is always in the JSON format)" )
	/* eslint-enable indent */

	var args = cliManager.run() ;
	//term( "%n\n" , args ) ;
	
	var ext = path.extname( args.schema ).slice( 1 ).toLowerCase() ;
	var schema ;
	
	switch ( ext ) {
		case 'kfg' :
			schema = kungFig.load( args.schema ) ;
			break ;
		case 'json' :
			schema = require( args.schema ) ;
			break ;
		default :
			term.red( "Extension '.%s' is not supported.\n" , ext ) ;
			process.exit( 1 ) ;
			break ;
	}

	var wxport = new WXport( schema ) ;
	await wxport.get( args.urls[ 0 ] ) ;
	
	if ( args.output ) {
		await fs.writeFile( args.output , JSON.stringify( wxport.export , null , '  ' ) ) ;
	}
	else {
		console.log( "EXPORT:\n" + JSON.stringify( wxport.export , null , '  ' ) ) ;
	}
}

module.exports = cli ;

