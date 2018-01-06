import * as express from "express";
import axios from "axios";
import { serialize, deserialize } from "serializer.ts/Serializer";
import { Blockchain } from "./blockchain";
import { Block } from "./block";

// Function for parsing contracts stored as JSON
export const reviver = (key: any, value: any) => {
  if (typeof value === "string" && value.indexOf("function ") === 0) {
    let functionTemplate = `(${value})`;
    return eval(functionTemplate);
  }
  return value;
};

// Function for stringifying contract to JSON
export const replacer = (key: any, value: any) => {
  if (typeof value === "function") {
    return value.toString();
  }
  return value;
};

export const getConsensus = (
  req: express.Request,
  res: express.Response,
  blockchain: Blockchain,
  nodeId: string
) => {
  const requests = blockchain.nodes
    .filter(node => node.id !== nodeId)
    .map(node => {
      const req = axios.get(`${node.url}blocks`);
      return req;
    });

  if (requests.length === 0) {
    res.json("There are no nodes to sync with!");
    res.status(404);

    return;
  }

  axios
    .all(requests)
    .then(
      axios.spread((...blockchains) => {
        if (
          blockchain.consensus(
            blockchains.map(res => deserialize<Block[]>(Block, res.data))
          )
        ) {
          res.json(`Node ${nodeId} has reached a consensus on a new state.`);
        } else {
          res.json(`Node ${nodeId} could not find a better candidate.`);
        }

        res.status(200);
        return;
      })
    )
    .catch(err => {
      console.log(err);
      res.status(500);
      res.json(err);
      return;
    });

  res.status(500);
};
