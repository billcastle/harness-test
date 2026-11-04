# simple personal expense tracker

create a simple personal expense tracker where i can upload my monthly credit card statement of account. it will then categorize the each expenses in the statement to show a dashboard of breakdown of expense.

i should also be able to manually add an expense where i can choose the date (default today), cost, and category.

this will be deployed so the data should be available online. choose a simple database like sqlite.

this will be deployed to a subdomain using vercel. the homepage should show a pincode field to access the actual tracker. the pincode should not be accessible in the source code.

make the ui design simple; add toggle for light and dark theme.

---

- use a ui library like shadcn for consistency
- use a date picker for the date when adding an expense
- date format should also be consistent
- default view in dashboard is the monthly summary/breakdown of expense
- allow to choose to display the summary/breakdown of a specific date or range of date
- add a feature for the most expensive day of the month
- add a bit more hue to the dark theme

---

- move the add expense form to a modal that can be opened from a cta at the top right; upload statement should be there too
- add settings button to top right. on click it should open modal for the settings. put the theme toggle there
- add a new field to the add expense: recurring where it will be added to the list of expense every month
- there should be a separate list of recurring expenses where user can modify or delete an entry; the list can be viewed in the settings 
- default currency should be PHP; make this configurable in settings
- add colored icons to the categories display in the dashboard / breakdown

---
Fix these:
- Deleting an expense still happens instantly, with no confirmation or undo.
- Settings still uses the browser's confirm() when you delete a recurring expense.
- in add expense form, make note label to "Title" make it required
- Fix mobile ui for the list of transactions - do a card design; make the title bigger

---

- make form fields in add expense bigger, spacier
- manual and upload statement should be a toggle switch component
- repeats field should be a group of radio buttons
- the cost in transaction list should be aligned in mobile view. currently, if it's a recurring item cost alignment is off
- modify card design to have two columns:
-----------------------------------
| date                  category  |
| title                 cost      |
|           edit icon delete icon |
-----------------------------------
- where date and category are small subtexts
- clicking edit should show a modal to edit the entry 
- add in setting for user to add/remove category
- fix spacing; add more white space
