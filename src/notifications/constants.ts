export const NOTIFICATIONS_PAGE_SIZE: number = 20
export const BACKUP_STATUS_MESSAGES: any = {
    successful_backup:
        'Your last backup was successfull. Hit Backup Now if you want to backup again.',
    unsuccessful_backup_internet:
        'Your last backup was unsuccessfull as there was no internet connectivity. Please try again.',
    unsuccessful_backup_drive_size:
        'Your last backup was unsuccessfull as there was no space in your google drive. Please clear some space and try again.',
    subscription_expiration:
        'Your Memex subscription has expired. Renew your subscription else Backups will have to be done manually.',
    upgraded_but_no_first_backup:
        'Great! You upgraded to automatic backups. However you will have to do your first backup manually.',
    unknown_error:
        'Your last backup was unsuccessful due to some unkown error. Please try again.',
    backup_only_local:
        'Your data is only stored on your computer. Back it up locally or to any cloud storage for free.',
    automatic_backup_message:
        'Backup your data automatically every 15 minutes. Worry-free.',
}
