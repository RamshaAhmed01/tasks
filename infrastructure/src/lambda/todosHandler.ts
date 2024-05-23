import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as dynamoose from "dynamoose";
import { createRemoteJWKSet, jwtVerify } from "jose";
import todosRequestValidationSchema from "./schemas/todosRequestValidationSchema";
import todosDatabaseSchema from "./schemas/todosDatabaseSchema";

const DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const env = process.env.ENV ?? "dev";
  const isAuth = process.env.AUTH ?? "true";

  let tokenPayload;

  if (isAuth === "true") {
    const jwt = event.headers?.Authorization?.split(" ")[1];

    if (!jwt) {
      return {
        statusCode: 401,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }
  
    const JWKS = createRemoteJWKSet(
      new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
    );

    try {
      const { payload } = await jwtVerify(jwt, JWKS, {
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        audience: process.env.AUTH0_AUDIENCE,
      });
  
      tokenPayload = payload;
    } catch (error) {
      console.error(error);
      return {
        statusCode: 401,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }
  } else {
    tokenPayload = { sub: "test" };
  }

  let ddb;
  if (env === "dev") {
    ddb = new dynamoose.aws.ddb.DynamoDB({
      region: "localhost",
      endpoint: "http://dynamodb-local:8000",
    });
  } else {
    ddb = new dynamoose.aws.ddb.DynamoDB();
  }

  dynamoose.aws.ddb.set(ddb);

  let result;
  try {
    const Todos = dynamoose.model("Todos", todosDatabaseSchema, {
      tableName: `TodosTable-${env}`,
      create: env === "test" ? true : false,
    });

    const userId = tokenPayload.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ message: "Unauthorized" }),
      };
    }

    if (event.httpMethod === "PUT") {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({ message: "No request body found" }),
        };
      }

      const parsedBody = todosRequestValidationSchema.parse(JSON.parse(event.body));

      const todos = new Todos({
        id: userId,
        todoList: parsedBody.todoList,
      });

      result = await todos.save();
    } else if (event.httpMethod === "GET") {
      result = await Todos.get(userId);

      if (result === undefined) {
        return {
          statusCode: 404,
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({ message: "No todo list found" }),
        };
      }
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(error),
    };
  }

  return {
    statusCode: 200,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(result),
  };
};
