import { test as baseTest, expect } from '@playwright/test';
import { registerData } from '../utils/dynamic-test';
import { baseDataTypes } from '../utils/data-generators';

const { test, data } = registerData(baseDataTypes, {
	postName: "title" as const,
	postContent: "paragraph" as const,
	likeCount: "integer" as const,
	username: {
		valid: ["sample-username"]
	}
}, baseTest);

test('has title', async ({ page }) => {
	await page.goto('https://playwright.dev/');

	// Expect a title "to contain" a substring.
	await expect(page).toHaveTitle(data.postName);
}, ["postName"]);

test('get started link', async ({ page }) => {
	await page.goto('https://playwright.dev/');

	// Click the get started link.
	await page.getByRole('link', { name: 'Get started' }).click();

	// Expects page to have a heading with the name of Installation.
	await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
