// This file illustrates a sample usage of the bridge.
// Please adjust config file.

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import SignVerifyVote from './signverifyvote';
import WebSocket from 'ws';

let pjson = require('../package.json');
let sukulogger = require('@suku/suku-logging')(pjson);

const config = {
	publicNode: {
		url: 'wss://ropsten.infura.io/ws/v3/<ropstenKey>',
		privateKey:
			'testPrivKey',
		address: '<address>',
		addressNonce: 0,
		contractAddress: '<contractAddress>',
	},
	privateNode: {
		url: 'HTTP://127.0.0.1:7545',
		privateKey:
			'<privateKey>',
	},
};

// HTTP
let app = express();
app.use(cors());
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(express.static(__dirname + '/../www'));

// API
const rootPath = '/api';
let signVerifyVote: SignVerifyVote = new SignVerifyVote(
	config.publicNode.contractAddress,
	config.publicNode.url
);

// Websocket
const wss = new WebSocket.Server({ port: 40510 });
sukulogger.info('Websocket listening on port ' + wss.options.port);
wss.on('connection', (ws) => {
	ws.send('Websocket server: Connection established.');
});

function broadcast(data) {
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
}

/*
  The transfer emitter is setup when a valid connection is made to the 
  blockchain along with a valid contract passed during initalization. 
 */
signVerifyVote.transferEmitter.on('Transfer', async function(
	blockNumber,
	fromAddress,
	toAddress
) {
	// Find proposals that are note at blockNumber
	// look for addresses in un
	sukulogger.info(
		`Recieved a Transfer event from ERC20 contract at address: ${signVerifyVote
			.tokenContract
			.address}. Blocknumber: ${blockNumber} From: ${fromAddress} To: ${toAddress}`
	);

	let fromTokenBalance = await signVerifyVote.getTokenBalance(fromAddress);
	let toTokenBalance = await signVerifyVote.getTokenBalance(toAddress);

	sukulogger.info(
		`From address balance: ${fromTokenBalance}. To address balance: ${toTokenBalance}.`
	);
});

/*
  ROUTES
*/
app.get(rootPath + '/test', (request, response) => {
	sukulogger.debug('Test Route!');
	let res = 'Test Passed!';
	broadcast(res);
	response.send(res);
});

app.get(rootPath + '/blocknumber', async (request, response) => {
	let blocknumber = await signVerifyVote.getBlockNumber();
	let res = `Current blocknumber is ${blocknumber}`;
	broadcast(res);
	response.send(res);
});

app.post(rootPath + '/gettokenbalance', async (request, response) => {
	let address = request.body.address;
	let blocknumber = request.body.blocknumber
		? request.body.blocknumber
		: undefined;

	let tokenBalance = await signVerifyVote.getTokenBalance(address, blocknumber);
	let res = `The token balance of address ${address} at block ${blocknumber
		? blocknumber
		: 'latest'} is ${tokenBalance}.`;
	broadcast(res);
	response.send(res);
});

app.get(rootPath + '/nonce', (request, response) => {
	let res = `Current Nonce: ${config.publicNode.addressNonce}`;
	broadcast(res);
	response.send(res);
});

app.post(rootPath + '/signvote', async (request, response) => {
	let proposal = request.body.proposal;
	let choice = request.body.choice;
	let nonce = request.body.nonce;

	/*
    Here we would pull the private key from vault
  */
	let signedmessage = await signVerifyVote.signVote(
		proposal,
		choice,
		nonce,
		config.publicNode.privateKey
	);

	let res = `Your signed vote message is: ${signedmessage}`;
	broadcast(response);
	response.send(res);
});

app.post(rootPath + '/signvote', async (request, response) => {
	let proposal = request.body.proposal;
	let choice = request.body.choice;
	let nonce = request.body.nonce;
	let signature = request.body.signature;
	let res;
	// let address = request.body.address;

	/* 
    NOTICE: Here the three inputs would be verified before moving forward
  */
	if (config.publicNode.addressNonce !== nonce) {
		sukulogger.error('Given nonce does not match the addressNonce');
		response = 'The give nonce is not accurate!';
		broadcast(response);
		response.send(res);
		return;
	}

	/*
    Verify that the proposalId is valid and the proposal is NOT expired 
  */
	let blocknumber = await signVerifyVote.getBlockNumber();
	// Using the blocknumber we can verify if the proposal is expired or not
	// *Once the proposal is expired we should set the expired flag in the DB and
	//   update all the balances at the expiration blocknumber to be accurate

	/*
    Verify that the choiceId is valid for the proposal 
  */
	// Verify choice

	/*
    Verify that the signature is accurate 
  */
	if (
		!await signVerifyVote.verifyVote(
			proposal,
			choice,
			nonce,
			signature,
			config.publicNode.address
		)
	) {
		sukulogger.error('Signature is invalid.');
		response = 'The given signature is invalid!';
		broadcast(response);
		response.send(response);
		return;
	}

	/*
    With all parameters verified, the vote can be cast in the DB. 
  */
	// Update DB with vote
	let tokenBalance = await signVerifyVote.getTokenBalance(
		config.publicNode.address
	);

	// Increase the nonce for this address by one.
	config.publicNode.addressNonce += 1;

	response = `Your vote has been successfully cast with ${tokenBalance} votes!`;
	broadcast(response);
	response.send(response);
});

app.listen(4000);
sukulogger.info('API listening on http://localhost:4000');
