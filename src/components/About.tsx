import React, { useState, useRef, useEffect } from 'react';
import { Target, Users, Zap, Shield, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

const HackingScene = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(true);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = 0.4;
    }
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.2 : 1}
      >
        <torusKnotGeometry args={[1, 0.3, 100, 16]} />
        <meshStandardMaterial
          color="#00ff41"
          emissive="#00ff41"
          emissiveIntensity={hovered ? 2 : 0.5}
          wireframe={true}
        />
      </mesh>

      {Array.from({ length: 50 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
          ]}
        >
          <planeGeometry args={[0.2, 0.2]} />
          <meshStandardMaterial
            color="#00ff41"
            emissive="#00ff41"
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          >
            <canvasTexture
              attach="map"
              image={(() => {
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = '#00ff41';
                  ctx.font = '24px monospace';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(Math.random() > 0.5 ? '1' : '0', 16, 16);
                }
                return canvas;
              })()}
              needsUpdate={true}
            />
          </meshStandardMaterial>
        </mesh>
      ))}
    </group>
  );
};

interface Command {
  command: string;
  output: string[];
  delay?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
  animate?: boolean;
}

const Terminal = () => {
  const [history, setHistory] = useState<Command[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const availableCommands = [
    'ls', 'cd', 'pwd', 'help', 'clear', 'whoami', 'matrix', 'hack', 'about', 'skills',
    'scan', 'decrypt', 'connect', 'analyze', 'trace', 'ifconfig', 'ping', 'nmap',
    'netstat', 'ssh', 'msfconsole', 'hydra', 'john', 'wireshark', 'tcpdump'
  ];

  const handleCommand = async (cmd: string): Promise<Command | null> => {
    const parts = cmd.split(' ');
    const mainCommand = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch(mainCommand) {
      case 'ls':
        return {
          command: cmd,
          output: [
            'Available pages:',
            'about/         - About us',
            'themes/        - Challenge tracks',
            'timeline/      - Event schedule',
            'gallery/       - Photo gallery',
            'prizes/        - Rewards & prizes',
         
          ],
          type: 'success'
        };

      case 'ifconfig':
        return {
          command: cmd,
          output: [
            'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500',
            '        inet 192.168.1.100  netmask 255.255.255.0  broadcast 192.168.1.255',
            '        inet6 fe80::1234:5678:9abc:def0  prefixlen 64  scopeid 0x20<link>',
            '        ether 00:11:22:33:44:55  txqueuelen 1000  (Ethernet)',
            '        RX packets 1234567  bytes 890123456 (890.1 MB)',
            '        RX errors 0  dropped 0  overruns 0  frame 0',
            '        TX packets 7654321  bytes 654321098 (654.3 MB)',
            '        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0'
          ],
          type: 'info'
        };

      case 'ping':
        if (!args[0]) {
          return {
            command: cmd,
            output: ['Usage: ping <host>'],
            type: 'error'
          };
        }
        setIsLocked(true);
        const pingResults = [];
        for (let i = 0; i < 4; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          pingResults.push(`64 bytes from ${args[0]}: icmp_seq=${i + 1} ttl=64 time=${Math.random() * 20 + 10 | 0}.${Math.random() * 1000 | 0} ms`);
        }
        setIsLocked(false);
        return {
          command: cmd,
          output: pingResults,
          type: 'success'
        };

      case 'nmap':
        if (!args[0]) {
          return {
            command: cmd,
            output: ['Usage: nmap <target>'],
            type: 'error'
          };
        }
        setIsLocked(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsLocked(false);
        return {
          command: cmd,
          output: [
            'Starting Nmap 7.94 ( https://nmap.org ) at 2024-03-20 15:30 EDT',
            'Nmap scan report for ' + args[0],
            'Host is up (0.0042s latency).',
            'Not shown: 997 closed tcp ports (reset)',
            'PORT    STATE SERVICE',
            '22/tcp  open  ssh',
            '80/tcp  open  http',
            '443/tcp open  https',
            '',
            'Nmap done: 1 IP address (1 host up) scanned in 2.05 seconds'
          ],
          type: 'info'
        };

      case 'msfconsole':
        return {
          command: cmd,
          output: [
            '                                                  ',
            '      .:okOOOkdc\'              \'cdkOOOko:.      ',
            '    .xOOOOOOOOOOOOc          cOOOOOOOOOOOOx.    ',
            '   :OOOOOOOOOOOOOOOk,      ,kOOOOOOOOOOOOOOO:   ',
            '  \'OOOOOOOOOkkkkOOOOO;    ;OOOOO0kkkkkOOOOOOO\'  ',
            '  oOOOOOOOO.    .oOOOOk  kOOOOo.    .OOOOOOOOo  ',
            '  dOOOOOOOO.      .cOOOOOOOOc.      .OOOOOOOOx  ',
            '  lOOOOOOOO.         ;OOOO;         .OOOOOOOOl  ',
            '  .OOOOOOOO.          ;OO;          .OOOOOOOO.  ',
            '   cOOOOOOO.                        .OOOOOOOc   ',
            '    oOOOOOO.                        .OOOOOOo    ',
            '     .dOOOO.                        .OOOOd.     ',
            '       .cOO.                        .OOc.       ',
            '         .:.                        .:.         ',
            '',
            '       =[ metasploit v6.3.4-dev                         ]',
            '+ -- --=[ 2294 exploits - 1191 auxiliary - 409 post       ]',
            '+ -- --=[ 968 payloads - 45 encoders - 11 nops            ]',
            '+ -- --=[ 9 evasion                                       ]',
            '',
            'Metasploit tip: Search can apply complex filters such as search cve:2009 type:exploit',
            '',
            'msf6 >'
          ],
          type: 'warning'
        };

      case 'cd':
        if (!args[0]) {
          return {
            command: cmd,
            output: ['Error: Please specify a directory'],
            type: 'error'
          };
        }
        const path = args[0].replace(/^\/+|\/+$/g, '');
        navigate(`/${path}`);
        return {
          command: cmd,
          output: [`Navigating to /${path}`],
          type: 'success'
        };

      case 'pwd':
        return {
          command: cmd,
          output: [`/home/project${window.location.pathname}`],
          type: 'info'
        };

      case 'help':
        return {
          command: cmd,
          output: [
            '╔════════════════════════════════════════╗',
            '║           Available Commands            ║',
            '╚════════════════════════════════════════╝',
            '',
            'Navigation:',
            '  ls              - List available pages',
            '  cd <directory>  - Navigate to a page',
            '  pwd            - Show current path',
            '',
            'System:',
            '  clear          - Clear terminal',
            '  whoami         - Show current user',
            '',
            'Special:',
            '  matrix         - Display Matrix effect',
            '  hack           - Initiate hack simulation',
            '  scan           - Network port scan',
            '  decrypt        - Decrypt encoded message',
            '  analyze        - System analysis',
            '  trace          - Trace IP address',
            '',
            'Info:',
            '  about          - Show team info',
            '  skills         - List our expertise',
            '  help           - Show this help message',
            '',
            'Tips:',
            '  - Use Tab for command completion',
            '  - Up/Down arrows for command history',
            '  - Ctrl+L to clear screen'
          ],
          type: 'info'
        };

      case 'clear':
        setHistory([]);
        return null;

      case 'whoami':
        return {
          command: cmd,
          output: ['root@cyberhx'],
          type: 'success'
        };

      case 'matrix':
        return {
          command: cmd,
          output: matrixRain(),
          delay: 100,
          animate: true
        };

      case 'hack':
        setIsLocked(true);
        const steps = [
          'Initializing hack sequence...',
          '[■■■□□□□□□□] 30% - Bypassing firewall',
          '[■■■■■□□□□□] 50% - Cracking encryption',
          '[■■■■■■■□□□] 70% - Accessing mainframe',
          '[■■■■■■■■■■] 100% - Access granted!',
          '',
          'Welcome to the system, hacker.'
        ];
        
        for (const step of steps) {
          await new Promise(resolve => setTimeout(resolve, 500));
          setHistory(prev => [...prev, { command: '', output: [step], type: 'warning' }]);
        }
        
        setIsLocked(false);
        return null;

      case 'scan':
        setIsLocked(true);
        const scanResults = await simulateNetworkScan();
        setIsLocked(false);
        return {
          command: cmd,
          output: scanResults,
          type: 'warning'
        };

      case 'decrypt':
        return {
          command: cmd,
          output: [
            'Decrypting message...',
            '01001000 01100101 01101100 01101100 01101111',
            'Decoded: "Hello, Hacker"'
          ],
          type: 'success',
          animate: true
        };

      case 'analyze':
        return {
          command: cmd,
          output: [
            'System Analysis Report',
            '━━━━━━━━━━━━━━━━━━━━━',
            'CPU Usage: ██████████ 98%',
            'Memory:    ████████░░ 82%',
            'Network:   ███████░░░ 75%',
            'Security:  █████████░ 90%'
          ],
          type: 'info'
        };

      case 'trace':
        return {
          command: cmd,
          output: [
            'Tracing IP: 192.168.1.1',
            '↳ Location: Unknown',
            '↳ Provider: Anonymous VPN',
            '↳ Status: Protected'
          ],
          type: 'warning'
        };

      case 'about':
        return {
          command: cmd,
          output: [
            '╔══════════════════════════════════╗',
            '║          CYBERHX                 ║',
            '║  Elite Cybersecurity Community   ║',
            '╚══════════════════════════════════╝',
            '',
            'Founded in 2024',
            'Mission: Empowering the next generation',
            'of ethical hackers and security experts'
          ],
          type: 'info'
        };

      case 'skills':
        return {
          command: cmd,
          output: [
            '⚡ Our Expertise ⚡',
            '',
            '▣ Penetration Testing',
            '▣ Network Security',
            '▣ Web Security',
            '▣ Malware Analysis',
            '▣ Reverse Engineering',
            '▣ Digital Forensics'
          ],
          type: 'success'
        };

      default:
        return {
          command: cmd,
          output: [`Command not found: ${cmd}. Type 'help' for available commands.`],
          type: 'error'
        };
    }
  };

  const matrixRain = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
    const lines = [];
    for (let i = 0; i < 10; i++) {
      let line = '';
      for (let j = 0; j < 50; j++) {
        line += chars[Math.floor(Math.random() * chars.length)];
      }
      lines.push(line);
    }
    return lines;
  };

  const simulateNetworkScan = async () => {
    const ports = [21, 22, 80, 443, 3306, 5432];
    const results = [];
    for (const port of ports) {
      results.push(`Scanning port ${port}...`);
      await new Promise(resolve => setTimeout(resolve, 300));
      results.push(`Port ${port}: ${Math.random() > 0.5 ? 'OPEN' : 'CLOSED'}`);
    }
    return results;
  };

  const executeCommand = async (cmd: string) => {
    if (isLocked) return;
    
    const result = await handleCommand(cmd);
    if (result) {
      setHistory(prev => [...prev, result]);
    }
    
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setCurrentCommand('');
    setShowSuggestions(false);
    
    scrollToBottom();
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter' && currentCommand.trim()) {
      executeCommand(currentCommand.trim());
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const suggestions = availableCommands.filter(cmd => 
        cmd.startsWith(currentCommand.toLowerCase())
      );
      if (suggestions.length === 1) {
        setCurrentCommand(suggestions[0]);
      } else if (suggestions.length > 1) {
        setSuggestions(suggestions);
        setShowSuggestions(true);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setHistory([]);
    }
  };

  const scrollToBottom = () => {
    if (terminalRef.current) {
      const scrollOptions: ScrollToOptions = {
        top: terminalRef.current.scrollHeight,
        behavior: 'smooth'
      };
      terminalRef.current.scrollTo(scrollOptions);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  useEffect(() => {
    const initialCommands = [
      'whoami',
      'pwd',
      'ls'
    ];

    const runInitialCommands = async () => {
      for (const cmd of initialCommands) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await executeCommand(cmd);
      }
    };
    
    runInitialCommands();

    // Focus input on click anywhere in terminal
    const handleTerminalClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const terminal = terminalRef.current;
    if (terminal) {
      terminal.addEventListener('click', handleTerminalClick);
    }

    return () => {
      if (terminal) {
        terminal.removeEventListener('click', handleTerminalClick);
      }
    };
  }, []);

  return (
    <div className="glass-effect rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-300 border-b border-gray-700 kali-terminal-header">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-400 text-sm ml-2">root@cyberhx: ~/security</span>
        </div>
        {isLocked && (
          <div className="text-primary text-sm animate-pulse">
            Processing...
          </div>
        )}
      </div>
      
      <div 
        ref={terminalRef}
        className="p-4 h-[400px] overflow-y-auto font-mono text-sm space-y-2 bg-dark-300 cursor-text kali-terminal"
      >
        {history.map((cmd, i) => (
          <div key={i} className="space-y-1">
            {cmd.command && (
              <div className="flex items-center gap-2">
                <span className="text-primary">root@cyberhx</span>
                <span className="text-gray-400">:</span>
                <span className="text-blue-400">~</span>
                <span className="text-gray-400">$</span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white"
                >
                  {cmd.command}
                </motion.span>
              </div>
            )}
            {cmd.output.map((line, j) => (
              <motion.div
                key={j}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: j * 0.1 }}
                className={`ml-4 font-mono ${
                  cmd.type === 'error' ? 'text-red-400' :
                  cmd.type === 'warning' ? 'text-yellow-400' :
                  cmd.type === 'success' ? 'text-green-400' :
                  'text-gray-300'
                } ${cmd.animate ? 'animate-pulse' : ''}`}
              >
                {line}
              </motion.div>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-primary">root@cyberhx</span>
          <span className="text-gray-400">:</span>
          <span className="text-blue-400">~</span>
          <span className="text-gray-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => {
              setCurrentCommand(e.target.value);
              setSuggestions(
                availableCommands.filter(cmd => 
                  cmd.startsWith(e.target.value.toLowerCase())
                )
              );
              setShowSuggestions(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyPress}
            className="bg-transparent border-none outline-none text-white flex-1"
            disabled={isLocked}
            autoFocus
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <div className="ml-4 text-gray-400">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="cursor-pointer hover:text-primary"
                onClick={() => {
                  setCurrentCommand(suggestion);
                  setShowSuggestions(false);
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const About = () => {
  const [expandedValue, setExpandedValue] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const values = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Our Mission",
      description: "Empower the next generation of ethical hackers",
      details: "Creating a secure digital future through education and hands-on training."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Community",
      description: "Building a network of security experts",
      details: "Our community thrives on collaboration and knowledge sharing."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Innovation",
      description: "Pushing boundaries in cybersecurity research",
      details: "We stay ahead of emerging threats through innovation."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Excellence",
      description: "Maintaining highest security standards",
      details: "Our members uphold the highest ethical standards."
    }
  ];

  const teamMembers = [
    {
      name: "Kushagra Dwivedi",
      role: "Founder of cyberhx",
      image: "https://i.ibb.co/dw8SKDgt/kush1.jpg" ,
      achievements: [
        "Ethical hacker government",
        "SIH Finalist 2024",
        "CTF National Player"
      ],
      expertise: [
        "Network Security",
        "Penetration Testing",
        "Ethical Hacking"
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const detailsVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { height: "auto", opacity: 1 }
  };

  return (
    <section id="about" className="py-16 bg-dark-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold gradient-text mb-3">About CyberHx</h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Elite cybersecurity community dedicated to securing the digital realm.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="h-[400px] w-full relative"
          >
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <HackingScene />
              <OrbitControls 
                enableZoom={false}
                maxPolarAngle={Math.PI / 2}
                minPolarAngle={Math.PI / 2}
              />
            </Canvas>
            <div className="absolute inset-0 bg-gradient-radial from-transparent to-dark-200 pointer-events-none" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Terminal />
          </motion.div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {values.map((value, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="glass-effect rounded-xl overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.div
                className="p-6"
                onClick={() => setExpandedValue(expandedValue === index ? null : index)}
              >
                <motion.div
                  className="text-primary mb-3 flex justify-center"
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  {value.icon}
                </motion.div>
                <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                <p className="text-sm text-gray-400">{value.description}</p>
                
                <motion.button
                  className="mt-4 text-primary flex items-center gap-2 mx-auto"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale:  0.9 }}
                >
                  {expandedValue === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  <span className="text-sm">{expandedValue === index ? 'Show Less' : 'REPORT SCAM'}</span>
                </motion.button>
              </motion.div>

              <AnimatePresence>
                {expandedValue === index && (
                  <motion.div
                    variants={detailsVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="px-6 pb-6"
                  >
                    <div className="h-px bg-gradient-to-r from-transparent via-primary to-transparent my-4" />
                    <p className="text-gray-300 text-sm">{value.details}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-white text-center mb-8">ORGANIZERS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                variants={itemVariants}
                className="glass-effect rounded-xl p-6 hover-scale"
              >
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                  />
                  <div>
                    <h4 className="text-xl font-semibold text-white">{member.name}</h4>
                    <p className="text-primary">{member.role}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-medium text-white mb-2">Achievements</h5>
                    <div className="space-y-2">
                      {member.achievements.map((achievement, i) => (
                        <div key={i} className="flex items-center text-gray-300">
                          <Trophy className="w-4 h-4 text-primary mr-2" />
                          <span className="text-sm">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-white mb-2">Expertise</h5>
                    <div className="flex flex-wrap gap-2">
                      {member.expertise.map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};