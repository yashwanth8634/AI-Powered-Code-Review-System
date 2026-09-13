import { NextResponse } from 'next/server';
import urlRegex from "url-regex";
import validateGitUrl from '@/app/utils/validateGitUrl';

export async function POST(request: Request) {
  const {giturl} = await request.json();
  const isValid = validateGitUrl(giturl);
  if(!isValid){
    return NextResponse.json({
        message:"Invalid url"
    },{status:400})
  }
  
    
    return NextResponse.json({
        data1:isValid
    })
}
  


export async function GET(request: Request) {
  const data = { message: "Hello from the backend!", success: true };

  return NextResponse.json(data, { status: 200 });
}

