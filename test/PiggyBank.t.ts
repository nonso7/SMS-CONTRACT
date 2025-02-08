import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { assert } from "console";
import hre from "hardhat";
import { expect } from "chai";

describe("Piggy bank test", () => {
  const deployBankContract = async () => {
    const targetAmount = hre.ethers.parseEther("10"); // Example: 10 ETH
    const withdrawalDate = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;

    const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

    const [owner, account1, account2, account3] = await hre.ethers.getSigners();

    const Piggybank = await hre.ethers.getContractFactory("PiggyBank");

    const deployPiggybank = await Piggybank.deploy(
      targetAmount,
      withdrawalDate,
      owner.address
    );

    return {
      deployPiggybank,
      owner,
      account2,
      account1,
      ADDRESS_ZERO,
      withdrawalDate,
      targetAmount,
    };
  };

  describe("Deployment", () => {
    it("should be deployed by manager", async () => {
      let { deployPiggybank, owner } = await loadFixture(deployBankContract);

      const runner = deployPiggybank.runner as HardhatEthersSigner;

      expect(runner.address).to.equal(owner.address);
    });
  });

  describe("Save function", () => {
    it("detect if caller is address zero", async () => {
      const depositAmount = hre.ethers.parseEther("1");
      const IMPERSONATED_ADDRESS = "0x0000000000000000000000000000000000000000";

      let { deployPiggybank, owner } = await loadFixture(deployBankContract);

      // Enable impersonation
      await hre.network.provider.send("hardhat_impersonateAccount", [
        IMPERSONATED_ADDRESS,
      ]);
      const impersonatedSigner = await hre.ethers.getSigner(
        IMPERSONATED_ADDRESS
      );

      // Fund the impersonated account
      await owner.sendTransaction({
        to: IMPERSONATED_ADDRESS,
        value: hre.ethers.parseEther("2"),
      });

      // Verify balance
      const balance = await hre.ethers.provider.getBalance(
        IMPERSONATED_ADDRESS
      );
      expect(balance).to.be.gte(hre.ethers.parseEther("2"));

      // Expect deposit to revert since msg.sender is zero address
      await expect(
        deployPiggybank
          .connect(impersonatedSigner)
          .save({ value: depositAmount })
      ).to.be.revertedWith("UNAUTHORIZED ADDRESS");
    });

    it("able to call the save function before withdrawal date", async () => {
      let { deployPiggybank, owner, account1, withdrawalDate } =
        await loadFixture(deployBankContract);

      const depositAmount = hre.ethers.parseEther("1");

      await expect(
        deployPiggybank.connect(account1).save({ value: depositAmount })
      ).to.not.be.reverted;
    });

    it("able to call the save function after withdrawal date", async () => {
      let { deployPiggybank, owner, account1, withdrawalDate } =
        await loadFixture(deployBankContract);

      const depositAmount = hre.ethers.parseEther("1");

      await time.increaseTo(Number(withdrawalDate) + 1);

      await expect(
        deployPiggybank.connect(account1).save({ value: depositAmount })
      ).to.be.revertedWith("YOU CAN NO LONGER SAVE");
    });

    it("throw an error if value is 0", async () => {
      const depositAmount = 0;

      let { deployPiggybank, owner, account1 } = await loadFixture(
        deployBankContract
      );

      await expect(
        deployPiggybank.connect(account1).save({ value: depositAmount })
      ).to.be.revertedWith("YOU ARE BROKE");
    });

    it("detect that contributors before calling save function is zero", async () => {
      let { deployPiggybank, owner, account1 } = await loadFixture(
        deployBankContract
      );
      const count = await deployPiggybank.contributorsCount();
      expect(count).to.eq(0);
    });

    it("detect that contributor count increase by one", async () => {
      const depositAmount = hre.ethers.parseEther("1");
      let { deployPiggybank, owner, account1 } = await loadFixture(
        deployBankContract
      );

      await owner.sendTransaction({
        to: account1,
        value: hre.ethers.parseEther("2"),
      });

      const balance = await hre.ethers.provider.getBalance(account1);
      expect(balance).to.be.gte(hre.ethers.parseEther("2"));

      const Beforecount = await deployPiggybank.contributorsCount();

      await deployPiggybank.connect(account1).save({ value: depositAmount });

      const Aftercount = await deployPiggybank.contributorsCount();

      expect(Aftercount).to.be.greaterThan(Beforecount);
    });

    it("detect that contributor count increase by one only if he hasnt previously contributed", async () => {
      const depositAmount = hre.ethers.parseEther("1");
      let { deployPiggybank, owner, account1 } = await loadFixture(
        deployBankContract
      );

      await owner.sendTransaction({
        to: account1,
        value: hre.ethers.parseEther("2"),
      });

      const balance = await hre.ethers.provider.getBalance(account1);
      expect(balance).to.be.gte(hre.ethers.parseEther("2"));

      const contributions = await deployPiggybank
        .connect(account1)
        .contributorsCount();

      if (contributions == BigInt(0)) {
        await deployPiggybank.connect(account1).save({ value: depositAmount });
      } else {
        await deployPiggybank.contributorsCount();
      }
    });

    it("detect that contributors before calling save function is zero", async () => {
      let { deployPiggybank, owner, account1 } = await loadFixture(
        deployBankContract
      );
      const count = await deployPiggybank.contributorsCount();
      expect(count).to.eq(0);
    });

    it("detect that a caller contribution was added", async () => {
      const depositAmount = hre.ethers.parseEther("1");
      let { deployPiggybank, owner, account1, account2 } = await loadFixture(
        deployBankContract
      );

      await owner.sendTransaction({
        to: account1,
        value: hre.ethers.parseEther("2"),
      });

      await owner.sendTransaction({
        to: account2,
        value: hre.ethers.parseEther("2"),
      });

      const balance = await hre.ethers.provider.getBalance(account1);
      expect(balance).to.be.gte(hre.ethers.parseEther("2"));

      const balance2 = await hre.ethers.provider.getBalance(account2);
      expect(balance2).to.be.gte(hre.ethers.parseEther("2"));

      await deployPiggybank.connect(account1).save({ value: depositAmount });
      let storedContribution = await deployPiggybank.contributions(account1);

      expect(storedContribution).to.be.eq(depositAmount);

      await deployPiggybank.connect(account2).save({ value: depositAmount });
      let storedContribution2 = await deployPiggybank.contributions(account2);

      expect(storedContribution2).to.be.eq(depositAmount);
    });

    it("should throw an emit after calling the save function", async () => {
        
    })
  });

  describe("withdrawal function", () => {
    it("only the owner should try withdrawing before withdrawal date", async () => {
      let { deployPiggybank, owner } = await loadFixture(deployBankContract);

      await expect(
        deployPiggybank.connect(owner).withdrawal()
      ).to.be.revertedWith("NOT YET TIME");
    });

    //THIS IS THROWING THE ERROR TARGET AMOUNT NOT REACHED
    it("revert if target amount not reached", async () => {
      let { deployPiggybank, owner, withdrawalDate, targetAmount } =
        await loadFixture(deployBankContract);
      const depositAmount = hre.ethers.parseEther("1");

      let contractBalance = await hre.ethers.provider.getBalance(
        deployPiggybank
      );
      //console.log(`Contract Balance:` contractBalance);

      await time.increaseTo(Number(withdrawalDate) + 1);

      await expect(
        deployPiggybank.connect(owner).withdrawal()
      ).to.be.revertedWith("TARGET AMOUNT NOT REACHED");

      expect(contractBalance).to.be.lt(targetAmount); // Ensure balance is lower
    });

    it("contract balance is greater than or equal to target amount", async () => {
        let { deployPiggybank, owner, withdrawalDate, account2, targetAmount } =
        await loadFixture(deployBankContract);

        await deployPiggybank.connect(account2).save({ value: targetAmount });
        await deployPiggybank.connect(account2).save({ value: targetAmount });

        let contractBalance = await hre.ethers.provider.getBalance(deployPiggybank);
        expect(contractBalance).to.be.gte(targetAmount); // Ensure balance is now sufficient
        
        await time.increaseTo(Number(withdrawalDate) + 1);

        // Withdraw should now succeed
        await expect(deployPiggybank.connect(owner).withdrawal()).to.not.be.reverted;
    })

    it("should revert if the caller isnt the owner", async () => {
      let { deployPiggybank, owner, account2 } = await loadFixture(
        deployBankContract
      );

      await expect(
        deployPiggybank.connect(account2).withdrawal()
      ).to.be.revertedWith("YOU WAN THIEF ABI ?");
    });
  });
});
