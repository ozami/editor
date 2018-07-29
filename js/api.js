function Api() {
  function request(command, data) {
    const body = new FormData()
    for (let name in data) {
      body.append(name, data[name])
    }
    return fetch(`/${command}.php`, {
      method: "POST",
      body,
    }).then(response => response.json()).then(function(response) {
      if (response.error) {
        return Promise.reject(response.error)
      }
      return response
    })
  }
  
  function writeFile(path, encoding, content) {
    return request("write", {path, encoding, content})
  }
  
  function deleteFile(path) {
    return request("delete", {path})
  }

  return {
    writeFile,
    deleteFile,
  }
}

module.exports = Api
