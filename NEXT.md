I created a new app called agent, this is and will be the whatsapp AI agent, it's structure like this:
(1) Whatsapp - For whatsapp, we'll be using wwebjs, when sending messages ourselves, e.g initiating conversatio s with parents by sending a report to them, make sure you leave gaps for rate limiting, e.g wait 60 seconds before sending what needs to be sent, setu a queue system so that w don't get banned since the library is unoffocial
(2) AI - Create an AI Agent with mastra and OpenAI, the Agent will gve access to tools that fetch relevant data throughout the app e.g whne speaking toa sbtduent (or teacher), it asks them for their emaila d apsword, it calls a function that verifies this dat(bevause ot cnm't do it itself since e.g the password is hashed, so it can't tell if what we have and what's  in the db agree) and then continues aethe convo, if the password is corrcet, now guve the agent their real name and data, they can now talk about their grades, trouble areas etc, give it ABSOLUTE SUPERPOWERS for each user
- Give the agent memort, able to remember previous emssages in the chat
- Give it tools as mentioned above
- Give it guardrails for replying to relevant info only
- Give it the user's data uin each message, what's available via wweb.js and what we receive from the backend at the start of the convo when we request their email and password
- Don't allow it to perform CUD operations (don't give it these tools)

Afyer you're done, create an endpoint that we can call with a phone number and message content to send a message, add newline and whatsapp formatting to the messages, here's a bit of info on whatsapp message formatting:
"
WhatsApp allows text formatting to add emphasis using simple symbols. Key formatting options include bolding with asterisks (*text*), italics with underscores (_text_), strikethrough with tildes (~text~), and monospace with backticks (```text```). Newer options (2024) include bulleted/numbered lists, block quotes, and inline code. 
Formatting Options & Syntax
Bold: Place an asterisk (*) on both sides of the text (e.g., *hello*).
Italic: Place an underscore (_) on both sides of the text (e.g., _hello_).
Strikethrough: Place a tilde (~) on both sides of the text (e.g., ~hello~).
Monospace: Place three backticks (```) on both sides of the text (e.g., ```hello```).
Bulleted List: Start the line with an asterisk (*) or hyphen (-) followed by a space (e.g., * item).
Numbered List: Start the line with a number, a period, and a space (e.g., 1. item).
Block Quote: Place an angle bracket (>) and a space before the text (e.g., > text).
Inline Code: Place a backtick (`) on both sides of the text (e.g., `text`). 
Tips
Combining Formats: You can combine them, such as *_bold and italic_*.
Context Menu: On mobile, you can highlight text and select formatting options (Bold, Italic, etc.) from the menu.
New Lines: Use Shift + Enter for a new line without sending the message.
Remove Formatting: Simply delete the special symbols surrounding the text. 
"

Use this wheh send messaes, make sure that for stuff like sending reports, we use tenmplates rather than suing OpenAI (that will incur costs), matter of fact, add optimisations in certain places so we favir temlates above OpenAI for saving

And then for each whatsapp message, make sure it increases the school's "whatsapp message" quotta for their currentplan use the db package in the agent app (this is why we used this turborepo archutecture, ruse of code across multipe apps)

And then register the new agent app in the sturborepo structure jsut like we did for the wbe app so that turborepo recognizes it and we can use the db package and others

Make commits at each step, let's go

-----------------------------------------
Now for every role except receptionist, allow the onboarding page to show different content depending on the user's role and add content for the onboaridng (decide on what's needed per role) and make each step optional for all the onboarding steps then make it so thqt after inviitng a user (with the specified role) they are redirecte to onbaording when they login

The  add a "receptionists" age to the admin sidenar and add content to tjis page, it should allow the admin to add / remove receptionists (auto-generate the password, send a welcome wmail, create the use rin the db, just like we're doign everywhere here)