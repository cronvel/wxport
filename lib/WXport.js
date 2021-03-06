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

const Logfella = require( 'logfella' ) ;
const log = Logfella.global.use( 'WXport' ) ;



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
	this.customTransforms = options.transforms && typeof options.transforms === 'object' ? options.transforms : null ;

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

	data = schema.populateValues( $ , urlStr , this.customTransforms ) ;

	if ( this.listenerCount( "page" ) ) {
		let stats = {
			done: this.queue.jobsDone.size
		} ;

		this.emit( "page" , urlStr , data , stats ) ;
	}

	log.info( "Done page: %s" , urlStr ) ;

	return data ;
} ;



// Get the web page, either from a direct download, or from the cache, if any
WXport.prototype.getPage = async function( urlStr ) {
	if ( ! this.pageCacheDir ) { return httpGetString( urlStr ) ; }

	var stats , content , age , newlineAt , cacheStatus , hasCache = false ,
		now = Date.now() ,
		urlFilename = encodeURIComponent( urlStr ) ,
		filePath = path.join( this.pageCacheDir , urlFilename ) ;

	try {
		stats = await fs.stat( filePath ) ;
		age = Math.round( ( now - stats.mtimeMs ) / 1000 ) ;
		hasCache = age <= this.pageCacheExpire ;
		log.verbose( "Found cache, age: %is ; file: %s" , age , filePath ) ;
	}
	catch ( error ) {
		// Not found
		log.verbose( "Cache not found for file: %s" , filePath ) ;
	}

	if ( hasCache ) {
		try {
			content = await fs.readFile( filePath , 'utf8' ) ;
			newlineAt = content.indexOf( '\n' ) ;
			if ( newlineAt <= 0 ) {
				hasCache = false ;
			}
		}
		catch ( error ) {
			hasCache = false ;
		}

		if ( hasCache ) {
			cacheStatus = content.slice( 0 , newlineAt ) ;
			content = content.slice( newlineAt + 1 ) ;
			if ( cacheStatus === '200' ) {
				log.verbose( "Using cache for file: %s" , filePath ) ;
				return content ;
			}

			let error = new Error( "StatusError" ) ;
			error.name = 'StatusError' ;
			error.statusCode = + cacheStatus || 'unknown' ;
			throw error ;
		}
	}

	// Nothing found, get it from the web and store it in cache
	try {
		content = await httpGetString( urlStr ) ;
	}
	catch ( error ) {
		log.verbose( "Error %s from the web: %s" , error.statusCode || '(unknown)' , urlStr ) ;
		await fs.writeFile( filePath , ( error.statusCode || 'unknown error' ) + '\n' ) ;
		// Always re-throw
		throw error ;
	}

	// Await here? We don't need it to be done before proceeding, but it's more clean to wait,
	// because it help avoiding/ tracking partly unwritten files.
	await fs.writeFile( filePath , "200\n" + content ) ;
	log.verbose( "Got from the web: %s -- written to file: %s" , urlStr , filePath ) ;

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

		log.verbose( "+ New URL: %s" , urlStr ) ;
		this.urls.add( urlStr ) ;
		if ( this.queue ) { this.queue.add( urlStr ) ; }
	} ) ;
} ;

