On the fees page, make sure the text on the buttons is "create new fee payment" and "create new fee record" instead of just "create fee". This makes it clearer to users that they are creating a payment or a record, not just a fee.
Make a commit for these changes

Then still on the fees page, add unique cards that contain data for:
(1) Fees paid this term
(2) Unpaid fees for this term
(3) Total fees paid this year
(4) Total unpaid fees this year
Make commit for this

Then still on the fees page, add a filter option to filter fee records by term and year. This will allow users to easily view fees for specific time periods. Make commit for this

Then add a table for "students owing" that lists students with unpaid fees, along with the amount owed. This will help users quickly identify which students have outstanding fees. Make commit for this

Add export options inside the students owing table and one at the top of the page to export all fee records. This will allow users to easily download and analyze fee data. Make commit for this

Finally, add filters for the time period at the top, allowign the user to select "this week", "this month", "this term", "this year", or a custom date range. This will provide more flexibility in viewing fee data for different time periods. Make commit for this

And then when creating a new fee payment, allow the receptionist or admin (these are the people who can create fee payments) to tie the payment to a student, and then subtract that from their termly fee owing . Then send a notification to the admin, the parent and the student for the new fee payment. Make commits for these changes

And then in the onboarding, add 2 more steps:
(1) Termly fees - the amount, in USD, that has to be paid by the students each term
(2) Current term - this step asks the admin to enter the start date of the current term and the term number for the year (the year is a read-only input field with the current year in it, the user has to enter the start month and date), then apply this to the entire app, so on the dash, all users see "Welcome, {user.name} and below that: "Term {X}, {year}"
Make commits for these changes

And then on the dash for the admin, add 2 unique buttons (somewhere where they are visible but still with good UX):
(1) End current term - when clicked, it shows a dialog asking the user `Are you sure you want to end Term {school.termNumber} {school.termYear}`, with "Confirm" and "Cancel". There are 3 terms in a year, so if term 3 ends, we ask the user when the next term will start


Okay okay, jsut note this:
- A date can either be a holiday period or a (school) term, okay ? 
- Because term and holiday days are unpredictable, somehow allow the admin to denote the start of a holiday, a new term, with holiday start (end can be provided anytime by clicking on the "end {holiday / term})