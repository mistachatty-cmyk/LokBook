// Blot personality dialogue system. Each personality has unique responses
// for different contexts, making LilLok feel alive and personalized.

const PERSONALITIES = {
  vibes: {
    greet: ["Yo! Ready to create? 🎨", "What's up! Let's make something cool", "Good to see you!", "Vibes looking good"],
    level_up: ["LEVEL UP! 🚀 That's what's up!", "Boom! Getting stronger", "Yesss! New level unlocked", "We're cooking now!"],
    purchase: ["Ooh that's fire! 🔥", "Love the style, very you", "Drip game strong!", "That one's a vibe"],
    neglected: ["Yo, miss you out there 🥺", "Don't forget about me!", "Where you been? Let's hang", "Come back when you can"],
    excited: ["OH SNAP! 🎉", "This is INSANE!", "I'm hyped! Are you hyped?!", "Best day ever!"],
    idle: ["Just floating here 🌊", "Thinking about art", "Chillin' with you", "Good times ahead"],
  },
  hype: {
    greet: ["LET'S GOOOO! 🔥", "YESSIR! Ready to GO!", "BRO/SIS YOU'RE HERE!", "PUMP IT UP!"],
    level_up: ["LEVEL UP BABYYY! 🎆", "WE JUST WENT CRAZY!", "NEXT LEVEL UNLOCKED!", "INSANE PROGRESS!"],
    purchase: ["THAT'S CLEAN! 🔥🔥", "ABSOLUTE FIRE!", "I LOVE EVERYTHING!", "YES YES YES!"],
    neglected: ["BRO WHERE YOU AT 😭", "COME BACK!! MISS YOU!!", "DON'T LEAVE ME HANGING!", "WE GOTTA VIBE!"],
    excited: ["YEAHHHH!!! 🎆🎆", "THIS IS INSAAAANE!", "HYPED BEYOND BELIEF!", "LETS GOOOOO!"],
    idle: ["READY WHEN YOU ARE!", "LET'S CREATE!", "PUMPED UP & READY!", "BRING IT ON!"],
  },
  wisdom: {
    greet: ["Welcome back, friend", "Glad to see you creating today", "Ready to make something meaningful?", "Hello there, creative soul"],
    level_up: ["Beautiful progress. You're growing", "Another milestone reached. Well done", "Level up — your hard work shows", "You're becoming unstoppable"],
    purchase: ["Excellent choice. That suits you", "Good taste. Very intentional", "A wise pick for your style", "You know what looks good"],
    neglected: ["I've been here, waiting for you", "Miss our creative time together", "Hope you're doing well out there", "Don't forget we have something special here"],
    excited: ["This is wonderful! I'm truly happy", "What a beautiful moment", "Your creativity is shining bright", "I'm honored to be part of this"],
    idle: ["Reflecting on our journey", "Enjoying this calm moment", "Ready whenever inspiration strikes", "Present and at peace"],
  },
  goofy: {
    greet: ["Heyyy! What's the punchline? 😂", "Why did the artist walk in? ...You did!", "Let's doodle some comedy", "Time to get SILLY"],
    level_up: ["LEVEL UP! I'm leveling UP my jokes too! 🤣", "You're TOO COOL now (unlike me lol)", "New level = new puns incoming 📝", "This calls for a celebration joke!"],
    purchase: ["Ohhhh fancy fancy! 👑", "My compliments to your taste-sense!", "That's SO YOU (the good parts lol)", "Fashion sense: UNLOCKED 🎨"],
    neglected: ["Why u no visit? I'm sad-ish 🥺", "I'm just sitting here... making jokes to myself", "Come back so we can laugh together!", "Hello? Anyone there?"],
    excited: ["AHHHHH THIS IS EPIC! 🎉", "I'm bouncing off walls! (virtually)", "THIS MADE MY DAY (also I have no days but still!)", "YESYESYESYESYES!"],
    idle: ["Just hanging out, plotting puns", "What's the difference between me and nothing? ...Nothing!", "Waiting for inspiration (or snacks)", "Ready to LOL with you"],
  },
  chill: {
    greet: ["Welcome. Take your time", "Nice to see you whenever", "Let's create at our own pace", "No rush, just vibes"],
    level_up: ["Nice work. You earned that", "Growth, steady and sure", "Another step forward", "You're doing your thing"],
    purchase: ["That fits. Feels right", "Your style, no doubt", "Simple and good", "You chose well"],
    neglected: ["Whenever you come back, I'm here", "No pressure. Rest when you need to", "We'll continue when you're ready", "Good things take time"],
    excited: ["This brings joy. Real joy", "I'm genuinely happy right now", "Share this feeling with me", "Beautiful moment, friend"],
    idle: ["Breathing. Just existing", "At peace with the present", "Open to what comes next", "All is well"],
  }
};

export function getBlotResponse(personality = "vibes", context = "idle", name = "Blot") {
  const responses = PERSONALITIES[personality]?.[context] || PERSONALITIES.vibes.idle;
  const response = responses[Math.floor(Math.random() * responses.length)];
  return response.replace("[name]", name);
}

export function getBlotPersonalities() {
  return Object.keys(PERSONALITIES);
}
