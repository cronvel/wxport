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
		.arg( 'config' ).string.mandatory
			.typeLabel( 'file' )
			.description( "The config file (JSON or KFG format)" )
		.restArgs( 'urls' ).string.mandatory
			.typeLabel( 'URL' )
			.description( "The URLs to scap" )
		.opt( [ 'output' , 'o' ] ).string
			.typeLabel( 'file' )
			.description( "The output file (output is always in the JSON format)" )
		.opt( [ 'page-cache-dir' , 'cache' ] ).string
			.typeLabel( 'directory' )
			.description( "Activate the page caching and used the provided argument as its directory" )
		.opt( [ 'page-cache-expire' , 'expire' ] ).number
			.description( "Set the expiration time in second for the cache (see --page-cache)" )
		.opt( 'limit' ).number
			.description( "Limit the number of page to retrieve" ) ;
	/* eslint-enable indent */

	var args = cliManager.run() ;
	term( "%n\n" , args ) ;

	var config ,
		ext = path.extname( args.config ).slice( 1 ).toLowerCase() ;

	switch ( ext ) {
		case 'kfg' :
			config = kungFig.load( args.config ) ;
			break ;
		case 'json' :
			config = require( args.config ) ;
			break ;
		default :
			term.red( "Extension '.%s' is not supported.\n" , ext ) ;
			process.exit( 1 ) ;
			break ;
	}

	config.baseDir = path.dirname( args.config ) ;
	delete args.config ;

	// Inherit from command line (command line has higher priority)
	Object.assign( config , args ) ;

	var data = {} ,
		wxport = new WXport( args.urls , config ) ;

	await wxport.start( ( urlStr , pageData , stats ) => {
		data[ urlStr ] = pageData ;
		if ( args.limit && stats.done >= args.limit ) { wxport.stop() ; }
	} ) ;

	if ( args.output ) {
		await fs.writeFile( args.output , JSON.stringify( data , null , '  ' ) ) ;
	}
	else {
		console.log( "EXPORT:\n" + JSON.stringify( data , null , '  ' ) ) ;
	}
}

module.exports = cli ;

