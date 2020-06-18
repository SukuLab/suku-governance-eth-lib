// import { Transaction, Account, TransactionReceipt } from 'web3/types';
import { Sign } from 'web3-eth-accounts';
import EthHelper from './ethhelper';
let pjson = require('../package.json');
let sukulogger = require('@suku/suku-logging')(pjson);

class SignVerifyVote extends EthHelper {
	constructor(contractAddress?: string, connectionString?: string) {
		super(contractAddress, connectionString);
	}

	public async signVote(
		proposalId: number,
		choiceId: number,
		nonce: number,
		privateKey?: string
	): Promise<string> {
		sukulogger.debug(`Signing vote`);
		let message: string = this.messageString(proposalId, choiceId, nonce);

		try {
			return await this.signMessage(message, privateKey);
		} catch (e) {
			sukulogger.error(`Error signing message: ${e}`);
			return '';
		}
	}

	public verifyVote(
		proposalId: number,
		choiceId: number,
		nonce: number,
		signature: string,
		address: string
	): boolean {
		sukulogger.debug(`Verifying vote`);
		let message: string = this.messageString(proposalId, choiceId, nonce);
		let signingAddress: string = this.recoverAddressFromMessage(
			message,
			signature
		);
		sukulogger.debug(`Signing Address: ${signingAddress}`);
		return address.toLowerCase() === signingAddress.toLowerCase();
	}

	public messageString(
		proposalId: number,
		choiceId: number,
		nonce: number
	): string {
		return `proposal=${String(proposalId)}choice=${String(
			choiceId
		)}nonce=${String(nonce)}`;
	}
}

export default SignVerifyVote;
