import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import { provider } from 'web3-providers';
import { Sign } from 'web3-eth-accounts';
import { EventEmitter } from 'events';
import abi from 'human-standard-token-abi';
import BigNumber from 'bignumber.js';
let pjson = require('../package.json');
let sukulogger = require('@suku/suku-logging')(pjson);

// TODO: Add functions:
// -set connection string

class EthHelper {
	protected web3: Web3 = new Web3('');
	protected online: boolean = false;

	public tokenContract: Contract = new this.web3.eth.Contract(abi, '0x0');
	public transferEmitter: EventEmitter = new EventEmitter();

	// protected tokenDecimals: BigNumber = new BigNumber(10 ** 18);
	protected tokenDecimals: number = 18;
	protected tokenSymbol: string = '';
	protected accounts: string[] = [];

	public ready: Promise<any>;

	constructor(contractAddress?: string, connectionString?: string) {
		this.ready = this.init(contractAddress, connectionString);
	}

	private async init(
		contractAddress: string = '',
		connectionString?: string
	): Promise<any> {
		/*
     *  Setup Web3 Provider 
     */
		if (
			connectionString &&
			(`ws://` === connectionString.substring(0, 5) ||
				`wss://` === connectionString.substring(0, 6))
		) {
			sukulogger.info(
				`Found valid websocket connection string. Connecting to: ${connectionString}.`
			);
			this.web3.setProvider(
				new Web3.providers.WebsocketProvider(connectionString)
			);
		} else {
			sukulogger.warning(
				'No valid web-socket connection string provided or Web3.givenProvider. Using a provider-less instance of Web3.'
			);
		}

		await this.refreshAccounts();

		/*
     *  Setup token contract and transfer emitter. 
     */
		try {
			await this.setContractAddress(contractAddress);
		} catch (e) {
			sukulogger.warning(
				'Contract address does not appear to be valid. Finishing setup of library as signing functionality will still be active.'
			);
		}

		return Promise.resolve();
	}

	public async setProvider(provider: provider): Promise<any> {
		sukulogger.info(`Setting new web3 provider.`);
		this.web3.setProvider(provider);
		try {
			await this.isConnected();
			let msg = 'web3 provider updated with a valid connection!';
			sukulogger.info(msg);
			await this.refreshAccounts();
			return Promise.resolve(msg);
		} catch (e) {
			let errorMsg =
				'web3 provider has been updated but there is not a valid connection.';
			sukulogger.error(errorMsg);
			return Promise.reject(errorMsg);
		}
	}

	public async isConnected(): Promise<any> {
		/*
     *  Check for valid blockchain connection
     */
		return this.web3.eth.net
			.isListening()
			.then(() => {
				return Promise.resolve('web3 has a valid connection.');
			})
			.catch((e) => {
				let errorMsg = `web3 is currently NOT connected. Received the following error: ${e}`;
				sukulogger.warning(errorMsg);
				return Promise.reject(errorMsg);
			});
	}

	public async setContractAddress(contractAddress: string): Promise<any> {
		sukulogger.info(`Setting contract address to ${contractAddress}.`);

		if (await this.checkIfContractExists(contractAddress)) {
			try {
				this.tokenContract.address = contractAddress;
				this.tokenSymbol = await this.tokenContract.methods.symbol.call();
				this.tokenDecimals = await this.tokenContract.methods.decimals.call();
				sukulogger.info(
					`Contract address has been set! Token Symbol: ${this
						.tokenSymbol}. Token Decimals: ${this.tokenDecimals}`
				);
				this.setupTransferEmitter();
				return Promise.resolve(contractAddress);
			} catch (e) {
				let errorMsg = `Error setting up contract address with error: ${e}`;
				sukulogger.error(errorMsg);
				return Promise.reject(errorMsg);
			}
		} else {
			let errorMsg = `Cannot setup contract as the contract address does not appear to be valid, or there is no active connection to the blockchain.`;
			sukulogger.warning(errorMsg);
			Promise.reject(errorMsg);
		}
	}

	private setupTransferEmitter() {
		// Generate filter options
		const options = {
			fromBlock: 'latest',
		};

		this.tokenContract.events
			.Transfer(options)
			.on('data', (event) => {
				let blockNumber = event.blockNumber;
				let fromAddress = event.returnValues.from;
				let toAddress = event.returnValues.to;
				sukulogger.info(
					`Received a Transfer Event on token contract from ${fromAddress} to ${toAddress} at block ${blockNumber}`
				);
				/*
          When a 'Transfer' event is emitted from the token contract the important 
          data is pulled out and emitted by the transferEmitter for processing.

         */
				this.transferEmitter.emit(
					'Transfer',
					blockNumber,
					fromAddress,
					toAddress
				);
			})
			.on('changed', (event) => {
				sukulogger.warning(
					`Received a 'changed' Transfer event on token contract: ${event}`
				);
			})
			.on('error', (event) => {
				sukulogger.error(
					`Received a Transfer event error on token contract: ${event}`
				);
			});
	}

	public async getBlockNumber(): Promise<number> {
		sukulogger.info(`Obtaining ETH Blocknumber`);
		try {
			return await this.web3.eth.getBlockNumber();
		} catch (error) {
			let errorMsg = `Unable to obtain ETH block number. Recieved error: ${error}`;

			sukulogger.warning(errorMsg);

			return Promise.reject(errorMsg);
		}
	}

	public async getTokenBalance(
		address: string,
		blocknumber?: number
	): Promise<BigNumber> {
		await this.ready;
		if (!await this.isConnected()) {
			let errorMsg = `Can't obtain token balance because there is no active connection to the blockchain.`;
			sukulogger.error(errorMsg);
			return Promise.reject(errorMsg);
		}

		if (!this.web3.utils.isAddress(address)) {
			let errorMsg = `Cannot obtain token balance of address: ${address} becaue it does not appear to be a valid address.`;
			sukulogger.error(errorMsg);
			return Promise.reject(errorMsg);
		}

		try {
			let tokenBalance: BigNumber = new BigNumber(
				await this.tokenContract.methods
					.balanceOf(address)
					.call({}, blocknumber)
			);

			return tokenBalance.div(new BigNumber(10 ** this.tokenDecimals));
		} catch (e) {
			let errorMsg = `Error getting tokenBalance for address ${address} at block: ${blocknumber
				? blocknumber
				: 'latest'} for contract at address: ${this.tokenContract
				.address} with error: ${e}`;

			sukulogger.error(errorMsg);
			return Promise.reject(errorMsg);
		}
	}

	public async checkIfContractExists(
		contractAddress: string
	): Promise<boolean> {
		if (!await this.isConnected()) {
			sukulogger.error(
				`Cannot obtain contract code because there is no active connection to the blockchain.`
			);
			return false;
		}

		try {
			let code = await this.web3.eth.getCode(contractAddress);
			if (code.length > 10) {
				return true;
			} else {
				let msg =
					'Error: Contract does not exist: ' +
					contractAddress +
					' on network ID: ' +
					(await this.getNetworkId());
				sukulogger.warning(msg);
				return false;
			}
		} catch (e) {
			return false;
		}
	}

	private async getNetworkId(): Promise<number> {
		await this.ready;
		return this.web3.eth.net.getId();
	}

	/*
    web3.eth.accounts.sign('Some data', '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318');
    > {
      message: 'Some data',
      messageHash: '0x1da44b586eb0729ff70a73c326926f6ed5a25f5b056e7f47fbc6e58d86871655',
      v: '0x1c',
      r: '0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd',
      s: '0x6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a029',
      signature: '0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a0291c'
    }
  */

	/**
  * Takes a message and uses either a private key or the main current provider account to sign the message. This method is protected to prevent malicious transaction signing. 
  * @param {string} message The message to sign.
  * @param {string} [privateKey] The private key used to sign the message. If this variable is not passed then the method will attempt to use the main current provider account. 
  * @return {Promise<string>} Returns the signature of the signed message.
  */
	protected async signMessage(
		message: string,
		privateKey?: string
	): Promise<string> {
		if (privateKey) {
			sukulogger.info(`Signing message: ${message} with provided private key.`);
			try {
				let signatureObject: Sign = this.web3.eth.accounts.sign(
					message,
					privateKey
				);
				return Promise.resolve(signatureObject.signature);
			} catch (error) {
				sukulogger.error(
					`Returned the following error when signing message: ${error}`
				);
				return Promise.reject('');
			}
		} else {
			sukulogger.info(
				`Signing message: ${message}. No private key passed, attempting to sign with current provider.`
			);

			let accounts = await this.web3.eth.getAccounts();
			if (accounts[0]) {
				sukulogger.info(`Attempting to sign message with found valid account.`);
				try {
					let signature = await this.web3.eth.personal.sign(
						message,
						accounts[0],
						''
					);
					// let signature = await this.web3.eth.sign(
					//  this.web3.eth.accounts.wallet[0],
					//  message
					// );
					return Promise.resolve(signature);
				} catch (e) {
					let errorMsg = `Error signing message with web3 account: ${e}`;
					sukulogger.error(errorMsg);
					return Promise.reject(errorMsg);
				}
			}

			let errorMsg = `No valid privateKey provided or account found.`;
			sukulogger.error(errorMsg);
			return Promise.reject(errorMsg);
		}
	}

	public recoverAddressFromMessage(message: string, signature: string): string {
		let signingAddress: string = this.web3.eth.accounts.recover(
			message,
			signature
		);
		return signingAddress;
	}

	protected async refreshAccounts() {
		await this.web3.eth.getAccounts((err, accs) => {
			sukulogger.debug('Refreshing accounts');
			if (err) {
				sukulogger.warning('There was an error fetching your accounts.');
				return;
			}

			// Get the initial account balance so it can be displayed.
			if (accs.length === 0) {
				sukulogger.warning(
					"Couldn't get any accounts! Make sure your Ethereum client is configured correctly."
				);
				return;
			}

			if (
				!this.accounts ||
				this.accounts.length !== accs.length ||
				this.accounts[0] !== accs[0]
			) {
				sukulogger.debug('Accounts refreshed!');

				// this.accountsObservable.next(accs);
				this.accounts = accs;
			}

			console.log('ready');
		});
	}
}

export default EthHelper;
