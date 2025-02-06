import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { assert } from "console";
import hre from "hardhat";
import { expect } from "chai";

describe('Piggy bank test', () => {
    
    const deployEventContract = async  () => {

        const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

        const [owner, account1, account2, account3] = await hre.ethers.getSigners();

        const bank = await hre.ethers.getContractFactory("piggybank");

        const deployBank = await bank.deploy(owner.address);

        return {deployBank, owner, account1, ADDRESS_ZERO}
    }

    describe("Deployment", () => {

        it('should be deployed by owner', async() => {
            let {deployBank, owner} = await loadFixture(deployEventContract);

            const runner = deployBank.runner as HardhatEthersSigner;

            expect(runner.address).to.equal(owner.address);
        })

        it('should not be address zero', async() => {
            let {deployBank, ADDRESS_ZERO} = await loadFixture(deployEventContract);

            expect(deployBank.target).to.not.be.equal(ADDRESS_ZERO);
        }) 
    })

    // describe('Create Event', () => {

    //     it('should create an event', async () => {

    //         const latestTime = await time.latest();

    //         let {deployEvent} = await loadFixture(deployEventContract);

    //         let eventCountBeforeDeployment = await deployEvent.event_count();

    //         let e = await deployEvent.createEvent('poolparty', 'come with your baddie', latestTime + 90, BigInt( latestTime + 86400), 0, 20);

    //         let eventCountAfterDeployment = await deployEvent.event_count();

    //         console.log(e)
    //         expect(eventCountAfterDeployment).to.be.greaterThan(eventCountBeforeDeployment);

    //     } )
    // })

    describe('deposit should only be called by owner', () => {
        it('the owner should call the deposite function', async () => {
            const depositAmount = ethers.parseEther("1")

            let {deployBank, owner, account1} = await loadFixture(deployEventContract);

            await expect(
                deployBank.connect(owner).deposit({ value: depositAmount })
            ).to.not.be.revertedWith("Only owner allowed");


        });

        it('another user to be able to call the deposite function', async () => {
            const depositAmount = ethers.parseEther("1")

            let {deployBank, owner, account1} = await loadFixture(deployEventContract);

            await expect(
                deployBank.connect(account1).deposit({ value: depositAmount })
            ).to.be.reverted;
        });

        it("should fund an impersonated account before depositing", async function () {
            const depositAmount = ethers.parseEther("1");
            const IMPERSONATED_ADDRESS = "0x0000000000000000000000000000000000000000";
        
            let { deployBank, owner } = await loadFixture(deployEventContract);
        
            // Enable impersonation
            await hre.network.provider.send("hardhat_impersonateAccount", [IMPERSONATED_ADDRESS]);
            const impersonatedSigner = await ethers.getSigner(IMPERSONATED_ADDRESS);
        
            // Fund the impersonated account
            await owner.sendTransaction({
                to: IMPERSONATED_ADDRESS,
                value: ethers.parseEther("2"),
            });
        
            // Verify balance
            const balance = await ethers.provider.getBalance(IMPERSONATED_ADDRESS);
            expect(balance).to.be.gte(ethers.parseEther("2"));
        
            // Expect deposit to revert since msg.sender is zero address
            await expect(
                deployBank.connect(impersonatedSigner).deposit({ value: depositAmount })
            ).to.be.reverted;
        });

        it('amount shouldnt be zero ', async () => {
            const depositAmount = 0;

            let {deployBank, owner, account1} = await loadFixture(deployEventContract);

            await expect(
                deployBank.connect(account1).deposit({ value: depositAmount })
            ).to.be.reverted;
        });

        it('amount was sent successfully', async () => {
            const depositAmount = ethers.parseEther("1");

            let {deployBank, owner, account1} = await loadFixture(deployEventContract);

            let initialContractBalance = await ethers.provider.getBalance(deployBank.target);

            await expect(
                deployBank.connect(owner).deposit({ value: depositAmount })
            ).not.to.be.revertedWith("Deposit failed");

            // let finalContractBalance = await ethers.provider.getBalance(deployBank.target);
            // expect(finalContractBalance).to.equal(initialContractBalance + depositAmount);
        });


        
        
    })

})