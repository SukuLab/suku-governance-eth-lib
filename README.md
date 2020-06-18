# SUKU Governance ETH Library
Welcome to the Governance ETH Library.

This library aims to abstract Ethereum interactions across multiple backend and frontend deployments to provide the functionality for Suku's governance mechanism. 

This package is used in [SUKU Governance](https://github.com/SukuLab/governance) and [SUKU Governance UI](https://github.com/SukuLab/governance-ui).

## Setup
`npm install @suku/suku-governance-eth-lib`

#### To run locally:
`git clone git@github.com:SukuLab/suku-governance-eth-lib.git`  
`cd governance-eth-lib`  
`npm install`  
`npm run build`  

#### To test
`npm run test`

#### Example File
An example server is given in in `./src/example.ts` Check out the example server and interact with the endpoints! 

##### To Run Example
`npm run example`

## Angular Configuration 
This package uses a logger that requires `fs`. 

`fs` is not supported in Angular so `package.json` must be updated to include the following:

```json
  "browser": {
    "fs": false,
    "path": false,
    "os": false
  },
```
