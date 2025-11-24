const { makeOptions, doRequest, preparePayload } = require("./utils")


/**
 * 
 * @param  {...any} args 
 */
export async function fetchService(...args) {
  let { service, payload } = preparePayload(...args);
  let query = '';
  if (!_.isEmpty(payload)) {
    let nested = 0;
    for(let k in payload){
      let v = payload[k]
      if(typeof(v) == 'object'){
        nested = 1;
        break;
      }else{
        v = encodeURI(v);
        query=`${query}${k}=${v}&`
      }
    }
    if(nested){
      query = `${encodeURIComponent(JSON.stringify(payload))}`;
    }
  }
  const { svc } = bootstrap()
  let url = `${svc}${service}?${query}`;
  let data = makeOptions({
    ...payload,
    method: "GET"
  });
  const r = doRequest.bind(this);
  return r(url, data);
};

/**
 * 
 * @param  {...any} args 
 */
export async function postService(...args) {
  let { service, payload } = preparePayload(...args);

  const { svc } = bootstrap()

  let url = `${svc}${service}`;
  let data = makeOptions({
    body: JSON.stringify(payload),
    cache: "no-cache",
    method: "POST",
  });
  const r = doRequest.bind(this);
  return r(url, data);
}

