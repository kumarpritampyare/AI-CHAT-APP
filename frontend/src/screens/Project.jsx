import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../context/user.context';
import { useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webcontainer';

function SyntaxHighlightedCode(props) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && props.className?.includes('lang-') && window.hljs) {
      window.hljs.highlightElement(ref.current);
      ref.current.removeAttribute('data-highlighted');
    }
  }, [props.className, props.children]);

  return <code {...props} ref={ref} />;
}

const Project = () => {
  const location = useLocation();
  const { user } = useContext(UserContext);
  const messageBox = useRef(null);

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(new Set());
  const [project, setProject] = useState(location.state.project);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [fileTree, setFileTree] = useState({});
  const [currentFile, setCurrentFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [webContainer, setWebContainer] = useState(null);
  const [iframeUrl, setIframeUrl] = useState(null);
  const [runProcess, setRunProcess] = useState(null);

  useEffect(() => {
    console.log("⚡ Initializing socket for project:", project._id);
    initializeSocket(project._id);

    getWebContainer().then(container => {
      setWebContainer(container);
      console.log("🧪 WebContainer started");
    });

    const unsubscribe = receiveMessage('project-message', data => {
        console.log("📩 Received socket message:", data);  // Add this log to inspect the message object
      
        if (data.sender._id === 'ai') {
          try {
            // Ensure data.message is a string before parsing
            if (typeof data.message === 'string') {
              const parsed = JSON.parse(data.message);
              console.log("✅ Parsed AI message:", parsed);
              if (parsed.fileTree) {
                setFileTree(parsed.fileTree);
                webContainer?.mount(parsed.fileTree);
              }
            } else {
              console.error("❌ AI message is not a string:", data.message);  // Log the data.message type and value
            }
          } catch (err) {
            console.error("❌ Failed to parse AI message:", err, data.message);
          }
        }
      
        setMessages(prev => [...prev, data]);
        scrollToBottom();
      });
      


    axios.get(`/projects/get-project/${project._id}`)
      .then(res => {
        setProject(res.data.project);
        setFileTree(res.data.project.fileTree || {});
      });

    axios.get('/users/all')
      .then(res => setUsers(res.data.users))
      .catch(console.error);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleUserClick = id => {
    setSelectedUserId(prev => {
      const updated = new Set(prev);
      updated.has(id) ? updated.delete(id) : updated.add(id);
      return updated;
    });
  };

  const addCollaborators = () => {
    axios.put('/projects/add-user', {
      projectId: project._id,
      users: Array.from(selectedUserId)
    })
    .then(res => {
      console.log("✅ Added collaborators:", res.data);
      setIsModalOpen(false);
    })
    .catch(console.error);
  };

  const createMessage = () => {
    console.log("📤 Sending message:", message);
    sendMessage('project-message', { message, sender: user });
    setMessages(prev => [...prev, { sender: user, message }]);
    setMessage('');
    scrollToBottom();
  };

  const WriteAiMessage = (msg) => {
    let text = 'No message received';  // Default text to handle empty or undefined messages
    
    if (typeof msg === 'string' && message.trim() !== '') {
      try {
        const data = JSON.parse(msg);
        text = data.text ?? msg;  // Safely extract text if it's a JSON object
      } catch {
        text = msg;  // Fallback to the original message if it's not parsable
      }
    } else if (msg && typeof msg === 'object') {
      text = msg.text ?? JSON.stringify(msg);  // Handle object case
    } else {
      text = String(msg);  // Convert to string if it's not string or object
    }
  
    return (
      <div className='overflow-auto bg-slate-100 text-black rounded-sm p-2'>
        <Markdown children={text} options={{ overrides: { code: SyntaxHighlightedCode } }} />
      </div>
    );
  };
  

  const saveFileTree = ft => {
    axios.put('/projects/update-file-tree', {
      projectId: project._id,
      fileTree: ft
    })
    .then(console.log)
    .catch(console.error);
  };

  const scrollToBottom = () => {
    if (messageBox.current) {
      messageBox.current.scrollTop = messageBox.current.scrollHeight;
    }
  };

  return (
    <main className='h-screen w-screen flex'>
      {/* Left: Chat + Collaborators */}
      <section className='left flex flex-col w-1/3 bg-slate-300'>
        <header className='flex justify-between p-4 bg-slate-100'>
          <button onClick={() => setIsModalOpen(true)} className='flex items-center gap-2'>
            <i className='ri-add-fill'></i><span>Add Collaborator</span>
          </button>
          <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}>
            <i className='ri-group-fill'></i>
          </button>
        </header>
        <div className='flex-grow overflow-auto p-4' ref={messageBox}>
          {messages.map((m, i) => (
            <div key={i} className={`${m.sender._id === 'ai' ? 'bg-slate-100' : 'bg-white'} p-2 mb-2 rounded shadow ${m.sender._id === user._id ? 'ml-auto' : ''}`}>
              <small className='text-xs text-gray-500'>{m.sender.email}</small>
              {m.sender._id === 'ai' ? WriteAiMessage(m.message) : <p>{m.message}</p>}
            </div>
          ))}
        </div>
        <div className='p-4 bg-slate-100 flex gap-2'>
          <input
            type='text'
            value={message}
            onChange={e => setMessage(e.target.value)}
            className='flex-grow p-2 border rounded'
            placeholder='Enter message'
          />
          <button onClick={createMessage} className='p-2 bg-blue-600 text-white rounded'>Send</button>
        </div>

        {/* Collaborators side panel */}
        <div className={`absolute top-0 left-0 bg-white w-full h-full transform ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform p-4`}>
          <h3 className='text-lg mb-2'>Collaborators</h3>
          {project.users?.map(u => (
            <div key={u._id} className='flex items-center gap-2 p-2 hover:bg-slate-200'>
              <i className='ri-user-fill'></i><span>{u.email}</span>
            </div>
          ))}
          <button onClick={() => setIsSidePanelOpen(false)} className='mt-4 p-2 bg-red-500 text-white rounded'>Close</button>
        </div>

        {/* Add Collaborator Modal */}
        {isModalOpen && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center'>
            <div className='bg-white p-6 rounded w-1/2'>
              <h3 className='text-xl mb-4'>Select Users</h3>
              <div className='max-h-64 overflow-auto mb-4'>
                {users.map(u => (
                  <div
                    key={u._id}
                    onClick={() => handleUserClick(u._id)}
                    className={`flex items-center gap-2 p-2 cursor-pointer ${selectedUserId.has(u._id) ? 'bg-slate-200' : ''}`}>
                    <i className='ri-user-fill'></i><span>{u.email}</span>
                  </div>
                ))}
              </div>
              <div className='flex justify-end gap-2'>
                <button onClick={() => setIsModalOpen(false)} className='px-4 py-2 bg-gray-300 rounded'>Cancel</button>
                <button onClick={addCollaborators} className='px-4 py-2 bg-blue-600 text-white rounded'>Add</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Right: File Explorer + Code Editor + Preview */}
      <section className='right flex-grow flex'>
        <div className='w-64 bg-slate-200 p-4 overflow-auto'>
          <h3 className='text-lg mb-2'>Files</h3>
          {Object.keys(fileTree).length === 0 && <p>No files</p>}
          {Object.keys(fileTree).map((file, idx) => (
            <div
              key={idx}
              onClick={() => { setCurrentFile(file); setOpenFiles(prev => [...new Set([...prev, file])]); }}
              className='p-2 mb-1 cursor-pointer bg-white rounded hover:bg-slate-300'>
              {file}
            </div>
          ))}
        </div>

        <div className='flex flex-col flex-grow'>
          <div className='flex border-b'>
            {openFiles.map((file, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentFile(file)}
                className={`px-4 py-2 ${currentFile === file ? 'bg-white border-t border-l border-r' : 'bg-slate-300'}`}>
                {file}
              </button>
            ))}
          </div>
          <div className='flex-grow overflow-auto p-4 bg-white'>
            {currentFile && (
              <pre className='hljs'>
                <code
                  className='hljs'
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e => {
                    const updated = e.target.innerText;
                    const ft = { ...fileTree, [currentFile]: { file: { contents: updated } } };
                    setFileTree(ft);
                    saveFileTree(ft);
                  }}
                  dangerouslySetInnerHTML={{ __html: hljs.highlight('javascript', fileTree[currentFile]?.file?.contents || '').value }}
                />
              </pre>
            )}
          </div>
          <div className='p-4 bg-slate-200'>
            <button
              onClick={async () => {
                await webContainer.mount(fileTree);
                const install = await webContainer.spawn('npm', ['install']);
                install.output.pipeTo(new WritableStream({ write(chunk) { console.log(chunk); } }));
                runProcess && runProcess.kill();
                const serverProcess = await webContainer.spawn('npm', ['start']);
                serverProcess.output.pipeTo(new WritableStream({ write(chunk) { console.log(chunk); } }));
                setRunProcess(serverProcess);
                webContainer.on('server-ready', (port, url) => setIframeUrl(url));
              }}
              className='px-4 py-2 bg-green-600 text-white rounded'>Run</button>
          </div>
          {iframeUrl && (
            <iframe src={iframeUrl} className='flex-grow w-full border-t'/>
          )}
        </div>
      </section>
    </main>
  );
};

export default Project;
