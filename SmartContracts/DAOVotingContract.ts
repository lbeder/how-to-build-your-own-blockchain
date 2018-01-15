const DAOVotingContract = {
  balance: 400,
  id: 3,
  authorizedVoters: [
    { nodeId: "A", address: "Alice" },
    { nodeId: "B", address: "Eve" },
    { nodeId: "A", address: "Gal Gadot" }
  ],
  votes: [
    {
      nodeId: "C",
      address: "Gal Gadot",
      votes: 0
    },
    {
      nodeId: "C",
      address: "Ben Affleck",
      votes: 0
    }
  ],
  fromAddress: "Bob",
  candidateA: {
    nodeId: "C",
    address: "Gal Gadot"
  },
  candidateB: {
    nodeId: "A",
    address: "Selena Gomez"
  },
  call: function() {
    return {
      getBalance: this.balance,
      getFromAddress: this.fromAddress
    };
  },
  send: function() {
    return {
      moveFunds: this.changeBalance
    };
  },
  moveFunds: function(userData, vote) {
    // Check if vote requester is authorized
    const authorizedVoterIdx = this.authorizedVoters.findIndex(
      user =>
        user.nodeId === userData.nodeId && user.address === userData.address
    );
    if (authorizedVoterIdx === -1) return null;

    // Check if candidate requester is voting for exists
    const candidateIndex = this.votes.findIndex(
      candidate => candidate.address === vote
    );
    if (candidateIndex === -1) return null;

    // Cast Vote and verify users can't vote twice
    this.votes[candidateIndex].votes++;
    this.authorizedVoters.splice(authorizedVoterIdx, 1);

    // Users still need to cast vote
    if (this.authorizedVoters.length > 0) return;

    this.votes.sort((voteA, voteB) => voteB.votes - voteA.votes);

    return {
      senderNodeId: "B",
      senderAddress: "Bob",
      recipientNodeId: this.votes[0].nodeId,
      recipientAddress: this.votes[0].address,
      value: 400,
      action: "TRANSACTION_EXTERNAL_ACCOUNT"
    };
  }
};

// DAOVotingContract.moveFunds({ nodeId: "A", address: "Gal Gadot" }, "Gal Gadot");
const stringifiedDAOVotingContract = eval(
  '({ balance: 400, id: 3, authorizedVoters: [{ nodeId: "A", address: "Alice" }, { nodeId: "B", address: "Eve" }, { nodeId: "A", address: "Gal Gadot" }], votes: [{ nodeId: "C", address: "Gal Gadot", votes: 0 }, { nodeId: "C", address: "Ben Affleck", votes: 0 }], fromAddress: "Bob", candidateA: { nodeId: "C", address: "Gal Gadot" }, candidateB: { nodeId: "A", address: "Selena Gomez" }, call: function() { return { getBalance: this.balance, getFromAddress: this.fromAddress };}, send: function() { return { moveFunds: this.changeBalance }; }, moveFunds: function(userData, vote) { const authorizedVoterIdx = this.authorizedVoters.findIndex( user => user.nodeId === userData.nodeId && user.address === userData.address); if (authorizedVoterIdx === -1) return null; const candidateIndex = this.votes.findIndex(candidate => candidate.address === vote); if (candidateIndex === -1) return null; this.votes[candidateIndex].votes++; this.authorizedVoters.splice(authorizedVoterIdx, 1); if (this.authorizedVoters.length > 0) return; this.votes.sort((voteA, voteB) => voteB.votes - voteA.votes); return { senderNodeId: "B", senderAddress: "Bob", recipientNodeId: this.votes[0].nodeId, recipientAddress: this.votes[0].address, value: 400, action: "TRANSACTION_EXTERNAL_ACCOUNT"};} })'
);
