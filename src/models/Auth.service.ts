import { Member } from "../libs/types/member";
import { AUTH_TIMER } from "../libs/config";
import jwt from "jsonwebtoken";
import Errors, { HttpCode, Message } from "../libs/Errors";

class AuthService {
  private readonly secretToken;
  constructor(){
    this.secretToken = process.env.SECRET_TOKEN;
  }

  public createToken(payload: Member){
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

  public async checkAuth(token: string):Promise <Member> {
    const result: Member = (await jwt.verify(
      token, 
      this.secretToken as string
    )) as Member;
    console.log("memberNick>>", result.memberNick);
    return result;
  }

}

export default AuthService;