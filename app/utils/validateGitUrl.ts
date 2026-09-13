
import urlRegex from "url-regex";

export default async function validateGitUrl(giturl:string){
    const isUrlValid = urlRegex().test(giturl);
    const isUrlLive = await fetch(giturl,{ method: 'HEAD' });
    if(!isUrlValid || !isUrlLive.ok){
        return false;
    }
    return true;
}