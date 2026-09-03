# ScheduleWith

An Expo-developed iOS exclusive streak-based app that handles daily schedules, and grants you XP and cool animations upon completing your tasks. The app will require no WiFi connection and all data is stored locally. Tasks will have varying XP gains, with some tasks having for example +10 and some having +20. 

The goal is simplicity, so there is only one ACTIVE schedule (with other schedules being able to be loaded anytime the user wants) which the user can edit anytime and the list has 2 sections: "To-Do" and "Completed!".

Users can also load or export schedules with a + button in the bottom right, that lets you create, load schedules OR export them as a .json. A user can have MANY schedules (in a list in the settings section) where it caches (on disk)/saves the loaded/created schedules, but they can only have ONE active schedule which will primarily show in the UI. The other (non-active) schedules that are being stored can also be deleted, edited, made active, or moved up and down.

There is NO account system. User data (schedules, pfp, display name and other settings) are stored locally. Settings include:
- User Profile Picture (stored locally) (SELECT IMAGE)
- Change Display Name (stored locally) (INPUT)
- Dark theme (TOGGLE)
- When does my day end? (SELECT TIME)
- Notifications (TOGGLE)
- Every 1 hour reminder notification to finish any unfinished tasks (sub-setting of the above) (TOGGLE)

General features:
- App's main incentive is cool animations, simplicity, streaks and a levelling-system to trigger the dopamine systems in the brain. As such, these will be the main focus and should be properly refined.
- There should be a levelling system and a streak system which will have increasingly cool animations for every consecutive day you check all the items on the app.
- Ticking items should be seamless and fun.
- Not doing the tasks at the end of the day should have a punishment, like sad figures inside the app and a sad animation with it opening a simplistic UI screen with sad figures, rain and a red button "Just Woke Up :(" in the middle, and a small green button below saying "Wait, give me an hour". If the small green button is pressed, it should give the user an hour before reverting back to the UI screen... UNLESS if they complete all the remaining tasks, which has a different UI described below.
- User can reset completed checklist manually with the "Just woke up" button.
- Once all the checklisted items are done, it opens a simplistic UI with a happy figure, confetti, and a green button in the middle "Just Woke Up!", and a small red button below that says "Send me back :("
- Upon first opening the app, it should display a cool animation, with white background and black text saying "Welcome to ScheduleWith", with a "Next >" button below. Then, it should ask you to enter your display name and allow you to OPTIONALLY set a profile picture.
- Creating schedules should be fun and seamless. First, user must create a new schedule (like a folder, for example), then create items in it with the name, description and varying XP gain from 10-100 on a slider.

UI: App theme is forest green and white background for light mode, and forest green and dark gray background for dark mode. Liquid glass will look good on this.
- Welcome screen
- Main UI should display user profile picture, XP until next level, current level, current streak and display name on the top with a horizontal liquid-glass cylindrical design.
- Below that should be the active schedule. 
- Bottom right will have a big green + button which will allow you to: "Create New Schedule", "Load Schedule", "Export Schedule as JSON". 
- User can swipe up from the bottom to show the navbar items, which include other schedules and settings.
- Other schedules can be managed by clicking on the navbar item, and we can assume how that page looks from the features described above.

Edge Cases:
- Items, when moved to the Completed section, should be able to be un-completed (removing tick) aswell assuming the user accidentally clicked on them.
- A schedule can be edited at any time, but you need to preserve historical information. User completes both → successful day. Then on Tuesday they edit the schedule and delete Workout. That shouldn't somehow alter Monday's record. So I'd store a lightweight **daily completion record** separately from the current schedule.
- Etc.