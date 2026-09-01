const axios = require('axios');
const fs = require('fs');

async function debug() {
  try {
    const loginRes = await axios.post('http://localhost:3000/users/login', {
      email: 'test@test.com',
      password: 'abcd'
    });
    const token = loginRes.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    const projectsRes = await axios.get('http://localhost:3000/projects/all', authHeaders);
    
    const collabcode = projectsRes.data.find(p => p.name === 'collab-code');
    const projRes = await axios.get(`http://localhost:3000/projects/get-project/${collabcode._id}`, authHeaders);
    const fileTree = projRes.data.fileTree;
    
    console.log("File tree keys:", Object.keys(fileTree));
    fs.writeFileSync('/Users/purna/Desktop/collab_code/scratch_fileTree.json', JSON.stringify(fileTree, null, 2));
    
    // Read server.js and fix it
    if (fileTree['server.js'] && fileTree['server.js'].file) {
       console.log("Original server.js:", fileTree['server.js'].file.contents.split('\n')[0]);
       
       // Update logic
       if (!fileTree['app.js'] && fileTree['src/app.js']) {
           fileTree['server.js'].file.contents = fileTree['server.js'].file.contents.replace("require('./app')", "require('./src/app')");
       }
       
       await axios.put(`http://localhost:3000/projects/update-filetree/${collabcode._id}`, { fileTree }, authHeaders);
       console.log("Fixed!");
    }

  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
debug();
