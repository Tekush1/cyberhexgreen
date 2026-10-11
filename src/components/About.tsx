import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mascot } from './shared/Mascot';

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
    'ls', 'cd', 'cat', 'pwd', 'help', 'clear', 'whoami', 'matrix', 'hack', 'about', 'skills',
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
            'flag.txt',
          ],
          type: 'success'
        };

      case 'cat':
        if (args[0] === 'flag.txt') {
          return {
            command: cmd,
            output: [
              '  ___ _____ ___ ',
              ' |  _|_   _|  _|',
              ' | |   | | | |_ ',
              ' |_|   |_| |___|',
              '',
              'Null0rigin{y8u_d1d_',
            ],
            type: 'success'
          };
        }
        return {
          command: cmd,
          output: [`cat: ${args[0] || ''}: No such file or directory`],
          type: 'error'
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
    <div className="card-ob overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-lime/80 shadow-[0_0_10px_rgba(198,241,53,0.7)]" />
          <span className="ml-2 font-mono text-xs text-white/45">root@cyberhx: ~/security</span>
        </div>
        {isLocked && (
          <div className="text-primary text-sm animate-pulse">
            Processing...
          </div>
        )}
      </div>
      
      <div 
        ref={terminalRef}
        className="h-[360px] cursor-text space-y-2 overflow-y-auto p-4 font-mono text-[13px] sm:h-[400px] sm:text-sm"
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
            aria-label="Terminal command"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
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

/* Team: only the name and the role at CyberHx. Add a person by adding a line. */
const team: { name: string; role: string; image: string }[] = [
  { name: 'Kushagra Dwivedi', role: 'Founder', image: 'https://i.ibb.co/dw8SKDgt/kush1.jpg' },
  { name: 'Aman Singh Tomar', role: 'Organizer', image: 'https://i.ibb.co/TDd8BKQW/profile-no-star-aman-tomar.png' },
];

const initials = (n: string) =>
  n
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

function TeamCard({ m, i }: { m: (typeof team)[number]; i: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: i * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
      className="team-card group"
    >
      <div className="team-photo">
        {broken ? (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(198,241,53,0.18),transparent_60%),linear-gradient(180deg,#101a33,#070a14)]">
            <span className="font-display text-6xl text-white/80">{initials(m.name)}</span>
          </div>
        ) : (
          <img
            src={m.image}
            alt={m.name}
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover object-top transition duration-700 ease-out group-hover:scale-[1.04]"
          />
        )}
        <span className="team-index">{String(i + 1).padStart(2, '0')}</span>
      </div>
      <div className="relative px-1.5 pb-1 pt-5">
        <h3 className="font-display text-[1.6rem] leading-tight text-white">{m.name}</h3>
        <p className="mt-2 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-lime">
          <span className="h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_10px_rgba(198,241,53,0.9)]" />
          {m.role} · CyberHx
        </p>
      </div>
    </motion.article>
  );
}

export const About = () => (
  <section id="about" className="relative overflow-hidden bg-ink pb-24 pt-28 sm:pb-32 sm:pt-32">
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60%_50%_at_75%_10%,rgba(59,211,255,0.10),transparent_70%),radial-gradient(45%_40%_at_10%_0%,rgba(198,241,53,0.07),transparent_70%)]" />
    <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" /> About CyberHx
          </p>
          <h1 className="mt-6 font-display text-5xl leading-[1.02] text-white sm:text-6xl">
            The people behind
            <span className="block text-white/45">the scoreboard.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            CyberHx started as a group of CTF players. Today we run open CTFs for the global security community, build
            events for universities and companies worldwide, and train people on our Pentest Lab.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="relative pt-16 sm:pt-20"
        >
          <Mascot pose="laugh-point" alt="CyberHx mascot" eager className="absolute -top-2 right-2 z-10 w-28 sm:right-6 sm:w-36" />
          <Terminal />
        </motion.div>
      </div>

      <div className="mt-28 sm:mt-36">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-lime">The team</p>
          <h2 className="mt-3 font-display text-4xl text-white sm:text-5xl">Who runs CyberHx</h2>
        </div>
        <div className="mx-auto mt-14 grid max-w-[19rem] gap-7 sm:max-w-3xl sm:grid-cols-2 sm:gap-8">
          {team.map((m, i) => (
            <TeamCard key={m.name} m={m} i={i} />
          ))}
        </div>
      </div>
    </div>
  </section>
);
