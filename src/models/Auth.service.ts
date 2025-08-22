import { Member } from "../libs/types/member";
import { AUTH_TIMER } from "../libs/config";
import jwt from "jsonwebtoken";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { Table } from "../libs/types/table";

class AuthService {
  private readonly secretToken;
  constructor(){
    this.secretToken = process.env.SECRET_TOKEN;
  }

  public createToken(payload: Member | Table){
    return new Promise((resolve, reject) => {
      const duration = `${AUTH_TIMER}h`;
      jwt.sign(
        payload, 
        process.env.SECRET_TOKEN as string, 
        {
          expiresIn: duration
        },
        (err, token) =>{
          if(err)
            reject(
              new Errors(HttpCode.UNAUTHORIZED, Message.TOKEN_CREATION_FAILED)
            );
          else resolve(token as string);
        }
      );
    });
  }

  public async checkAuth(token: string):Promise <Member | Table> {
    const result: Member|Table = (await jwt.verify(
      token, 
      this.secretToken as string
    )) as Member | Table;
    console.log("memberNick>>", result._id);
    return result;
  }

}

export default AuthService;