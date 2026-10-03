import os

# Use the script directory to locate schema.prisma
script_dir = os.path.dirname(os.path.abspath(__file__))
schema_path = os.path.join(script_dir, "schema.prisma")

with open(schema_path, "r") as f:
    content = f.read()

old1 = "  liveTrackingSettings LiveTrackingSettings?"
new1 = "  liveTrackingSettings LiveTrackingSettings?\n  documents            Document[]\n  announcements        Announcement[]"
content = content.replace(old1, new1)

old2 = "  mfaSecret    String?  \n  createdAt    DateTime   @default(now())\n  updatedAt    DateTime   @updatedAt\n  deletedAt    DateTime?\n\n  tenant     Tenant     @relation(fields: [tenantId], references: [id])\n  employeeId String?   @unique\n  employee   Employee? @relation(fields: [employeeId], references: [id])\n  documents        Document[]"
new2 = "  mfaSecret    String?  \n  createdAt    DateTime   @default(now())\n  updatedAt    DateTime   @updatedAt\n  deletedAt    DateTime?\n\n  tenant     Tenant     @relation(fields: [tenantId], references: [id])\n  employeeId String?   @unique\n  employee   Employee? @relation(fields: [employeeId], references: [id])\n  documents        Document[]\n  announcements      Announcement[]"
content = content.replace(old2, new2)

old3 = "  employees        Employee[]\n  departments      Department[]\n  holidayCalendars HolidayCalendar[]\n  workLocations    WorkLocation[]"
new3 = "  employees        Employee[]\n  departments      Department[]\n  holidayCalendars HolidayCalendar[]\n  workLocations    WorkLocation[]\n  announcements    Announcement[]"
content = content.replace(old3, new3)

with open(schema_path, "w") as f:
    f.write(content)

print("Done - added reverse relations to schema.prisma")