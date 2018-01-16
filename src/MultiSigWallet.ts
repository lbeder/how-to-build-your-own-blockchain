import {Address} from "./Address";
import {Wallet} from "./Wallet";
import {Transaction} from "./Transaction";
import { sha256} from 'js-sha256'

export class MultiSigWallet extends Wallet {

    public multiSigPublicKeys: Array<Address>; 

    constructor(multiSigAddress: Address,multiSigPublicKeys: Array<Address>) {
        super();
        super.setAddress(multiSigAddress);
        super.setType("multiSig");
        this.multiSigPublicKeys = multiSigPublicKeys;
    }

    public static generateMultiSigAddress(publicAddress_A: Address, publicAddress_B: Address, publicAddress_C: Address){
        const combinedAddresses = `${publicAddress_A.id} ${publicAddress_B.id} ${publicAddress_C.id}`;
        return new Address(sha256(combinedAddresses));
    }
}