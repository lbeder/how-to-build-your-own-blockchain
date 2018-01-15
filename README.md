# My Pull Request

In this repository, you'll find the source code for my pull request.

I set out to build a blockchain inspired by the Ethereum implementation.

[I wrote an in-depth post about the features I implemented,](https://medium.com/@omergoldberg/building-a-blockchain-the-grey-paper-5be456018040)
the architecture and the overall approach. I chose to write it on Medium, as it is easier to format. I recommend reading the post, as it aims to explain my work clearly. The main features implemented are:

## Smart Contracts

Enable users to write smart contracts and decentralized applications where they can create their own arbitrary rules for ownership, transaction formats and state transition functions.

## Accounting Systems

Users will be able to register accounts (external accounts) with a balance, and initiate transfers of funds. Additionally, users can register contract accounts and deploy smart contracts across the network

## Transaction-based state machine

State is composed of ownership status of currency within the system. All actions dispatched by nodes in the network are verified and checked before mutating state and being written to the blockchain.

## Secured and validated transactions and state transitions.

Authenticating accouts is done via RSA encryption. Upon account initialization a private, public key pair is created and written to disk. These keys are used to digitally sign outgoing transaction requests with the account credentials.

## Getting Started

* npm install

* navigate to root of how-build-your-own-blockchain and run tsc -w (assuming you have the typescript compiler installed globally)

## Postman with new API calls

Please load the Postman client with the postman_collection_omer.json file.

## Running Scripts

The src/shell-scripts dir contains all of the tests. Each test is explained in the Medium post.
