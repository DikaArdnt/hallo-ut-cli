import axios from 'axios';
import colors from 'colors';
import inquirer from 'inquirer';
import WebSocket from 'ws';

/**
 * Format text with ANSI escape codes for CLI display
 *
 * @param {string} text
 * @returns {string}
 */
function prettyText(text) {
	// Bold: **text** -> bold text
	text = text.replace(/\*\*([^*]+)\*\*/g, (_, match) => colors.bold(colors.underline(match)));

	// Italic: *text* or _text_ -> italic text
	text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, match) => colors.italic(match));
	text = text.replace(/_(?!_)([^_]+)_(?!_)/g, (_, match) => colors.italic(match));

	// Underline: __text__ -> underlined text
	text = text.replace(/__([^_]+)__/g, (_, match) => colors.underline(match));

	// Strikethrough: ~~text~~ -> strikethrough text (if supported)
	text = text.replace(/~~([^~]+)~~/g, (_, match) => colors.strikethrough(match));

	// Links: [text](url) -> text (url in cyan)
	text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => `${label} (${colors.cyan(colors.underline(url))})`);

	// Lists: - item -> • item
	text = text.replace(/^\s*-\s+(.+)/gm, (_, match) => `• ${match}`);

	// Headers: #, ##, ### -> formatted headers
	text = text.replace(/^### (.+)/gm, (_, match) => colors.blue(colors.bold(match))); // H3 in blue
	text = text.replace(/^## (.+)/gm, (_, match) => colors.green(colors.bold(match))); // H2 in green
	text = text.replace(/^# (.+)/gm, (_, match) => colors.underline(colors.bold(match))); // H1 bold + underline

	return text.trim();
}

function generateUniqueId() {
	const randomNumber = Math.random() * 1e18;
	const randomString = randomNumber.toString(36).substring(2);
	if (randomString.length < 10) {
		return `r_${randomString.padEnd(10, '0')}`;
	}
	return `r_${randomString.substring(0, 10)}`;
}

async function question(chatId, conversationId, text) {
	const { data } = await axios.post(
		`https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities`,
		{
			attachments: [],
			channelData: {
				attachmentSizes: [],
				clientActivityID: generateUniqueId().replace('r_', ''),
			},
			text,
			textFormat: 'plain',
			type: 'message',
			channelId: 'webchat',
			from: {
				id: chatId,
				name: '',
				role: 'user',
			},
			locale: 'id',
			localTimestamp: new Date(),
			localTimezone: 'Asia/Jakarta',
			entities: [
				{
					requiresBotState: true,
					supportsListening: true,
					supportsTts: true,
					type: 'ClientCapabilities',
				},
			],
		},
		{
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Origin: 'https://hallo-ut.ut.ac.id',
				Referer: 'https://hallo-ut.ut.ac.id/',
				'User-Agent':
					'Mozilla/ 5.0(Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari / 537.36 Edg / 127.0.0.0',
				'X-Ms-Bot-Agent': 'DirectLine/3.0 (directlinejs; WebChat/4.17.0 (Full) 0.15.5)',
				'X-Requested-With': 'XMLHttpRequest',
				Authorization: 'Bearer Bt4GygDWhK8.R36LqB_0Pwx3YHfyKx5E6Y7tbJXRcfvZy2y_HT0nud4',
			},
		}
	);

	return data;
}

async function start() {
	const chatId = generateUniqueId();

	const { data: conversation } = await axios.post(
		'https://directline.botframework.com/v3/directline/conversations',
		{
			user: {
				id: chatId,
			},
		},
		{
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Origin: 'https://hallo-ut.ut.ac.id',
				Referer: 'https://hallo-ut.ut.ac.id/',
				'User-Agent':
					'Mozilla/ 5.0(Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari / 537.36 Edg / 127.0.0.0',
				'X-Ms-Bot-Agent': 'DirectLine/3.0 (directlinejs; WebChat/4.17.0 (Full) 0.15.5)',
				'X-Requested-With': 'XMLHttpRequest',
				Authorization: 'Bearer Bt4GygDWhK8.R36LqB_0Pwx3YHfyKx5E6Y7tbJXRcfvZy2y_HT0nud4',
			},
		}
	);

	const ws = new WebSocket(conversation.streamUrl, {
		perMessageDeflate: false,
		headers: {
			'accept-language': 'id,en-US;q=0.9,en;q=0.8',
			connection: 'upgrade',
			host: 'directline.botframework.com',
			origin: 'https://hallo-ut.ut.ac.id',
			'sec-websocket-extensions': 'permessage-deflate; client_max_window_bits',
			'user-agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
		},
	});

	ws.on('open', () => {
		setInterval(() => {
			ws.send('');
		}, 20 * 1000);
	});

	ws.on('message', async messageRaw => {
		messageRaw = messageRaw.toString();
		if (!messageRaw) return;

		const messages = JSON.parse(messageRaw);

		if (messages && messages.activities && messages.activities.length) {
			for (const message of messages.activities) {
				if (message.type !== 'message') continue;
				if (message.from && message.from.id !== 'ut-root-main-bot') continue;

				if (message?.attachments && Array.isArray(message.attachments)) {
					message.attachments[0].content.body?.filter(v => v.text)?.map(v => console.log(prettyText(v.text)));
				}

				if (message?.suggestedActions?.actions) {
					if (message?.text) {
						console.log(prettyText(message.text));
						console.log('\n');
					}

					inquirer
						.prompt([
							{
								type: 'select',
								name: 'inputHint',
								message: 'Choose one : ',
								choices: Array.from(new Set([...message.suggestedActions.actions.map((v, i) => v.name || v.title), 'Kembali', 'Quit'])),
							},
						])
						.then(async result => {
							const text = result.inputHint;

							// Exit the process
							if (/^(quit|exit)$/i.test(text)) {
								process.exit(0);
							}

							await question(chatId, conversation.conversationId, text);
						});
				} else {
					if (message.inputHint) {
						if (message?.text) {
							console.log(prettyText(message.text));
						}

						if (message.inputHint != 'ignoringInput') {
							console.log('\n');
							inquirer
								.prompt([
									{
										type: 'input',
										name: 'text',
										message: 'Answer : ',
										default: "type 'quit' to exit or type 'kembali' to back",
									},
								])
								.then(async result => {
									const text = result.text;

									// Exit the process
									if (/^(quit|exit)$/i.test(text)) {
										process.exit(0);
									}

									await question(chatId, conversation.conversationId, text);
								});
						}
					}
				}
			}
		}
	});
}

await start();
