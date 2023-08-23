For setup:
`npm install`
`npx playwright install`

Install Playwright VSCode extension.
Go to testing tab.
Running all tests in a file works correctly.
Running a single test gives a 'No tests found' error.

If you run `npx playwright test --ui` you can run individual tests fine via the UI mode.

It appears that it depends on your `playwright.config.ts` file as to whether it errors or gives a warning and exits, but either way, it doesn't run the test when running individually.
