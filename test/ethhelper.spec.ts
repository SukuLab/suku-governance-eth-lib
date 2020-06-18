import EthHelper from '../src/ethhelper';
import SignVerifyVote from '../src/signverifyvote';
import { expect } from 'chai';
import 'mocha';
import { Contract } from 'web3-eth-contract';

const ws_ropstenKey: string =
	'wss://ropsten.infura.io/ws/v3/ropstenKey';

// TODO: Address string
const contractAddress = '<contractAddress>';
const onboardingAddress = '<onboardingAddress>';

const testBlock = 5590700;
const testPrivateKey =
	'<testPrivKey>';
const testAddress = '<testAddress>';
const proposalId = 1234;
const choiceId = 1;
const nonce = 5555;
const onboardingBalance = 452022.18;

describe('EthHelper', async () => {
	const ethHelper: EthHelper = new EthHelper(contractAddress, ws_ropstenKey);
	it('should return an EthHelper object', () => {
		expect(ethHelper).to.be.an('Object');
	});

	describe('ready()', () => {
		it('should eventually be ready', (done) => {
			ethHelper.ready.then(() => done());
		});
	});

	describe('ETHHelper Functions', () => {
		it('should obtain the current blocknumber', async () => {
			let blockNumber = await ethHelper.getBlockNumber();
			console.log(`Block height: ${blockNumber}`);
			expect(blockNumber).to.be.greaterThan(5.59 * 10 ** 6);
			// expect(acc.privateKey).length.to.be.greaterThan(20);
		});

		describe('Contract Functions', () => {
			it(`should obtain onbaording address balance at blocknumber ${testBlock}`, async () => {
				let tokenBalance: number = Number(
					await ethHelper.getTokenBalance(onboardingAddress, testBlock)
				);
				expect(tokenBalance).to.be.equal(onboardingBalance);
			});
		});
	});
});

/**
 * SignVerifyVote Web Sockets
 */
describe('SignVerifyVote Web Sockets', async () => {
	const signVerifyVote: SignVerifyVote = new SignVerifyVote(
		contractAddress,
		ws_ropstenKey
	);
	it('should return an EthHelper object', () => {
		expect(signVerifyVote).to.be.an('Object');
	});

	describe('ready()', () => {
		it('should eventually be ready', (done) => {
			signVerifyVote.ready.then(() => done());
		});
	});

	describe('ETHHelper Functions', () => {
		it('should obtain the current blocknumber', async () => {
			let blockNumber = await signVerifyVote.getBlockNumber();
			console.log(`Block height: ${blockNumber}`);
			expect(blockNumber).to.be.greaterThan(5.59 * 10 ** 6);
			// expect(acc.privateKey).length.to.be.greaterThan(20);
		});

		describe('Contract Functions', () => {
			it(`should obtain contract balance at blocknumber ${testBlock}`, async () => {
				let tokenBalance: number = Number(
					await signVerifyVote.getTokenBalance(onboardingAddress, testBlock)
				);
				expect(tokenBalance).to.be.equal(onboardingBalance);
			});
		});
	});

	describe('Sign Verify Functions', () => {
		let signature: string;
		let tokenContract: Contract;

		it('should sign a message', async () => {
			signature = await signVerifyVote.signVote(
				proposalId,
				choiceId,
				nonce,
				testPrivateKey
			);
			console.log(`Signature: ${signature}`);
			expect(signature.length).to.be.greaterThan(20);
		});

		it('should verify the previous message', async () => {
			let verified: boolean = await signVerifyVote.verifyVote(
				proposalId,
				choiceId,
				nonce,
				signature,
				testAddress
			);
			expect(verified).to.equal(true);
		});
	});

	describe('SignVerifyVote empty connection string', async () => {
		const signVerifyVote: SignVerifyVote = new SignVerifyVote();
		it('should return an EthHelper object', () => {
			expect(signVerifyVote).to.be.an('Object');
		});

		describe('Sign Verify Functions', () => {
			let signature: string;
			let tokenContract: Contract;

			it('should sign a message', async () => {
				signature = await signVerifyVote.signVote(
					proposalId,
					choiceId,
					nonce,
					testPrivateKey
				);
				console.log(`Signature: ${signature}`);
				expect(signature.length).to.be.greaterThan(20);
			});

			it('should verify the previous message', async () => {
				let verified: boolean = await signVerifyVote.verifyVote(
					proposalId,
					choiceId,
					nonce,
					signature,
					testAddress
				);
				expect(verified).to.equal(true);
			});
		});
	});

	describe('SignVerifyVote empty connection string', async () => {
		const signVerifyVote: SignVerifyVote = new SignVerifyVote();
		it('should return an EthHelper object', () => {
			expect(signVerifyVote).to.be.an('Object');
		});

		describe('Sign Verify Functions', () => {
			let signature: string;
			let tokenContract: Contract;

			it('should sign a message', async () => {
				signature = await signVerifyVote.signVote(
					proposalId,
					choiceId,
					nonce,
					testPrivateKey
				);
				console.log(`Signature: ${signature}`);
				expect(signature.length).to.be.greaterThan(20);
			});

			it('should verify the previous message', async () => {
				let verified: boolean = await signVerifyVote.verifyVote(
					proposalId,
					choiceId,
					nonce,
					signature,
					testAddress
				);
				expect(verified).to.equal(true);
			});
		});
	});
});
