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
const Promise = require( 'seventh' ) ;

const url = require( 'url' ) ;
const path = require( 'path' ) ;
const EventEmitter = require( 'events' ) ;
const fs = require( 'fs' ).promises ;
const fsKit = require( 'fs-kit' ) ;

const Schema = require( './Schema.js' ) ;
const Expression = require( './Expression.js' ) ;

const DAY_S = 24 * 60 * 60 ;	// Number of second in a day
const ALLOWED_PROTOCOL = new Set( [ 'http' , 'https' ] ) ;



function WXport( urls , options = {} ) {
	this.urls =
		urls instanceof Set ? urls :
		Array.isArray( urls ) ? new Set( urls ) :
		new Set( [ urls ] ) ;

	this.schemas = Array.isArray( options.schemas )  ?  options.schemas.map( e => new Schema( e ) )  :  [ new Schema( options.schemas ) ] ;
	this.concurrency = options.concurrency || 4 ;
	this.followLinks = options.followLinks === undefined ? true : !! options.followLinks ;
	this.crossDomain = !! options.crossDomain ;		// Follow links to other domain

	// If set, this activate page caching, and use this directory to store them
	this.pageCacheDir =
		! options.pageCacheDir || typeof options.pageCacheDir !== 'string' ? null :
		path.isAbsolute( options.pageCacheDir ) ? options.pageCacheDir :
		options.baseDir ? path.join( options.baseDir , options.pageCacheDir ) :
		options.pageCacheDir ;
	// Expire time in seconds for caching, defaulting to 1 day
	this.pageCacheExpire = options.pageCacheExpire || DAY_S ;

	this.queue = null ;
}

WXport.prototype = Object.create( EventEmitter.prototype ) ;
WXport.prototype.constructor = WXport ;

module.exports = WXport ;

WXport.Schema = Schema ;
WXport.Expression = Expression ;



WXport.prototype.start = async function( onPage ) {
	if ( onPage ) { this.on( 'page' , onPage ) ; }
	if ( this.queue ) { return this.queue.idle ; }

	// Sync part, should be done before async, because we rely on this.queue existance
	this.queue = new Promise.Queue( urlStr => this.get( urlStr ) , this.concurrency ) ;

	// Async part may start here
	if ( this.pageCacheDir ) {
		await fsKit.ensurePath( this.pageCacheDir ) ;
	}

	this.queue.addBatch( this.urls ) ;
	this.queue.run() ;

	return this.queue.idle ;
} ;



WXport.prototype.stop = function() {
	if ( ! this.queue ) { return ; }
	this.queue.stop() ;
} ;



// Get the data associated with an url
WXport.prototype.get = async function( urlStr ) {
	var html , $ , schema , data ;

	// If it doesn't match any URL, only download it if we follow links
	if ( ! this.schemas.find( s => s.isUrlMatching( urlStr ) ) ) {
		if ( this.followLinks ) {
			html = await this.getPage( urlStr ) ;
			$ = cheerio.load( html ) ;
			this.addLinkedUrls( $ , urlStr ) ;
		}

		return ;
	}

	html = await this.getPage( urlStr ) ;
	$ = cheerio.load( html ) ;

	if ( this.followLinks ) { this.addLinkedUrls( $ , urlStr ) ; }

	// Find the correct schema
	schema = this.schemas.find( s => s.isMatching( urlStr , $ ) ) ;
	//console.log( "Matching:" , schema ) ;

	if ( ! schema ) { return ; }

	data = schema.populateValues( $ , urlStr ) ;

	if ( this.listenerCount( "page" ) ) {
		let stats = {
			done: this.queue.jobsDone.size
		} ;

		this.emit( "page" , urlStr , data , stats ) ;
	}

	console.log( "Done page: " , urlStr ) ;

	return data ;
} ;



// Get the web page, either from a direct download, or from the cache, if any
WXport.prototype.getPage = async function( urlStr ) {
	if ( ! this.pageCacheDir ) { return httpGetString( urlStr ) ; }

	var stats , age , content = null ,
		now = Date.now() ,
		urlFilename = encodeURIComponent( urlStr ) ,
		filePath = path.join( this.pageCacheDir , urlFilename ) ;

	try {
		stats = await fs.stat( filePath ) ;
		age = Math.round( ( now - stats.mtimeMs ) / 1000 ) ;
		console.log( "Found cache, age:" , age , "s ; file:" , filePath ) ;

		// Not expired?
		if ( age <= this.pageCacheExpire ) {
			content = await fs.readFile( filePath ) ;
			console.log( "Using cache for file:" , filePath ) ;
		}
	}
	catch ( error ) {
		// Not found
		console.log( "Cache not found for file:" , filePath ) ;
	}

	if ( content === null ) {
		// Nothing found, get it from the web and store it in cache
		content = await httpGetString( urlStr ) ;

		// Do not await here, we don't need it to be done before proceeding
		fs.writeFile( filePath , content ) ;
		console.log( "Got from the web:" , urlStr , "-- written to file:" , filePath ) ;
	}

	return content ;
} ;



WXport.prototype.addLinkedUrls = function( $ , fromUrl ) {
	var fromParsedUrl = url.parse( fromUrl ) ;

	$( 'a' ).each( ( index , element ) => {
		var urlStr = $( element ).attr( 'href' ) ;
		if ( ! urlStr ) { return ; }

		//console.log( "Found URL:" , urlStr ) ;
		urlStr = url.resolve( fromUrl , urlStr ) ;

		var parsedUrl = url.parse( urlStr ) ;

		if ( parsedUrl.protocol && ! ALLOWED_PROTOCOL.has( parsedUrl.protocol.slice( 0 , -1 ) ) ) {
			//console.log( "  > Unsupported protocol:" , urlStr ) ;
			return ;
		}

		parsedUrl.hash = null ;
		urlStr = parsedUrl.format() ;

		if ( ! this.crossDomain && fromParsedUrl.hostname !== parsedUrl.hostname ) {
			//console.log( "  > Cross domain not allowed:" , urlStr ) ;
			return ;
		}

		if ( this.urls.has( urlStr ) ) {
			//console.log( "  > URL already known:" , urlStr ) ;
			return ;
		}

		console.log( "  > New URL:" , urlStr ) ;
		this.urls.add( urlStr ) ;
		if ( this.queue ) { this.queue.add( urlStr ) ; }
	} ) ;
} ;

