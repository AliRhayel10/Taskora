-- TaskoraDB schema only
-- Contains CREATE TABLE statements only, no data records.
-- Excludes __EFMigrationsHistory.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- Table: Companies
CREATE TABLE `Companies` (
  `CompanyId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyName` varchar(150) NOT NULL,
  `CompanyCode` varchar(50) NOT NULL,
  `EmailDomain` varchar(100) DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
  `CompanyPhone` varchar(30) NOT NULL,
  `Address` varchar(255) NOT NULL,
  PRIMARY KEY (`CompanyId`),
  UNIQUE KEY `UQ_Companies_CompanyName` (`CompanyName`),
  UNIQUE KEY `UQ_Companies_CompanyCode` (`CompanyCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: Roles
CREATE TABLE `Roles` (
  `RoleId` int(11) NOT NULL AUTO_INCREMENT,
  `RoleName` varchar(50) NOT NULL,
  PRIMARY KEY (`RoleId`),
  UNIQUE KEY `UQ_Roles_RoleName` (`RoleName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: Users
CREATE TABLE `Users` (
  `UserId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyId` int(11) NOT NULL,
  `FullName` varchar(150) NOT NULL,
  `Email` varchar(150) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
  `PasswordResetToken` varchar(255) DEFAULT NULL,
  `PasswordResetTokenExpiresAt` datetime DEFAULT NULL,
  `ProfileImageUrl` varchar(500) DEFAULT NULL,
  `JobTitle` varchar(100) NOT NULL,
  `PendingEmail` varchar(150) DEFAULT NULL,
  `EmailChangeOtp` varchar(10) DEFAULT NULL,
  `EmailChangeOtpExpiresAt` datetime DEFAULT NULL,
  PRIMARY KEY (`UserId`),
  UNIQUE KEY `UQ_Users_Email` (`Email`),
  KEY `IX_Users_CompanyId` (`CompanyId`),
  CONSTRAINT `FK_Users_Companies` FOREIGN KEY (`CompanyId`) REFERENCES `Companies` (`CompanyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: Teams
CREATE TABLE `Teams` (
  `TeamId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyId` int(11) NOT NULL,
  `TeamName` varchar(100) NOT NULL,
  `Description` varchar(255) DEFAULT NULL,
  `TeamLeaderUserId` int(11) DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`TeamId`),
  UNIQUE KEY `UQ_Teams_Company_TeamName` (`CompanyId`,`TeamName`),
  KEY `IX_Teams_CompanyId` (`CompanyId`),
  KEY `IX_Teams_TeamLeaderUserId` (`TeamLeaderUserId`),
  CONSTRAINT `FK_Teams_Companies` FOREIGN KEY (`CompanyId`) REFERENCES `Companies` (`CompanyId`),
  CONSTRAINT `FK_Teams_TeamLeader` FOREIGN KEY (`TeamLeaderUserId`) REFERENCES `Users` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: TeamMembers
CREATE TABLE `TeamMembers` (
  `TeamMemberId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyId` int(11) NOT NULL,
  `TeamId` int(11) NOT NULL,
  `UserId` int(11) NOT NULL,
  `JoinedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`TeamMemberId`),
  UNIQUE KEY `UQ_TeamMembers_Team_User` (`TeamId`,`UserId`),
  KEY `IX_TeamMembers_CompanyId` (`CompanyId`),
  KEY `IX_TeamMembers_TeamId` (`TeamId`),
  KEY `IX_TeamMembers_UserId` (`UserId`),
  CONSTRAINT `FK_TeamMembers_Companies` FOREIGN KEY (`CompanyId`) REFERENCES `Companies` (`CompanyId`),
  CONSTRAINT `FK_TeamMembers_Teams` FOREIGN KEY (`TeamId`) REFERENCES `Teams` (`TeamId`),
  CONSTRAINT `FK_TeamMembers_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: TaskStatuses
CREATE TABLE `TaskStatuses` (
  `TaskStatusId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyId` int(11) NOT NULL,
  `StatusName` varchar(100) NOT NULL,
  `DisplayOrder` int(11) NOT NULL DEFAULT 0,
  `IsDefault` tinyint(1) NOT NULL DEFAULT 0,
  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`TaskStatusId`),
  UNIQUE KEY `UQ_TaskStatuses_Company_StatusName` (`CompanyId`,`StatusName`),
  KEY `IX_TaskStatuses_CompanyId` (`CompanyId`),
  KEY `IX_TaskStatuses_Company_DisplayOrder` (`CompanyId`,`DisplayOrder`),
  CONSTRAINT `FK_TaskStatuses_Companies` FOREIGN KEY (`CompanyId`) REFERENCES `Companies` (`CompanyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: PriorityMultipliers
CREATE TABLE `PriorityMultipliers` (
  `PriorityMultiplierId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyId` int(11) NOT NULL,
  `PriorityName` varchar(20) NOT NULL,
  `MultiplierValue` decimal(10,2) NOT NULL,
  PRIMARY KEY (`PriorityMultiplierId`),
  UNIQUE KEY `UQ_PriorityMultipliers_Company_Priority` (`CompanyId`,`PriorityName`),
  CONSTRAINT `FK_PriorityMultipliers_Companies` FOREIGN KEY (`CompanyId`) REFERENCES `Companies` (`CompanyId`),
  CONSTRAINT `CK_PriorityMultipliers_Name` CHECK (`PriorityName` in ('Low','Medium','High','Critical')),
  CONSTRAINT `CK_PriorityMultipliers_Value` CHECK (`MultiplierValue` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: ComplexityMultipliers
CREATE TABLE `ComplexityMultipliers` (
  `ComplexityMultiplierId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyId` int(11) NOT NULL,
  `ComplexityName` varchar(20) NOT NULL,
  `MultiplierValue` decimal(10,2) NOT NULL,
  PRIMARY KEY (`ComplexityMultiplierId`),
  UNIQUE KEY `UQ_ComplexityMultipliers_Company_Complexity` (`CompanyId`,`ComplexityName`),
  CONSTRAINT `FK_ComplexityMultipliers_Companies` FOREIGN KEY (`CompanyId`) REFERENCES `Companies` (`CompanyId`),
  CONSTRAINT `CK_ComplexityMultipliers_Name` CHECK (`ComplexityName` in ('Simple','Medium','Complex')),
  CONSTRAINT `CK_ComplexityMultipliers_Value` CHECK (`MultiplierValue` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: UserRoles
CREATE TABLE `UserRoles` (
  `UserRoleId` int(11) NOT NULL AUTO_INCREMENT,
  `UserId` int(11) NOT NULL,
  `RoleId` int(11) NOT NULL,
  `AssignedAt` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`UserRoleId`),
  UNIQUE KEY `UQ_UserRoles_User_Role` (`UserId`,`RoleId`),
  KEY `IX_UserRoles_UserId` (`UserId`),
  KEY `IX_UserRoles_RoleId` (`RoleId`),
  CONSTRAINT `FK_UserRoles_Roles` FOREIGN KEY (`RoleId`) REFERENCES `Roles` (`RoleId`),
  CONSTRAINT `FK_UserRoles_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: Tasks
CREATE TABLE `Tasks` (
  `TaskId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyId` int(11) NOT NULL,
  `TeamId` int(11) NOT NULL,
  `Title` varchar(200) NOT NULL,
  `Description` text DEFAULT NULL,
  `AssignedToUserId` int(11) DEFAULT NULL,
  `FormerAssignedUserName` varchar(200) DEFAULT NULL,
  `FormerAssignedUserEmail` varchar(256) DEFAULT NULL,
  `CreatedByUserId` int(11) NOT NULL,
  `Priority` varchar(20) NOT NULL,
  `Complexity` varchar(20) NOT NULL,
  `EstimatedEffortHours` decimal(10,2) NOT NULL,
  `Weight` decimal(10,2) NOT NULL,
  `StartDate` date NOT NULL,
  `DueDate` date NOT NULL,
  `TaskStatusId` int(11) NOT NULL,
  `Feedback` text DEFAULT NULL,
  `IsArchived` tinyint(1) NOT NULL DEFAULT 0,
  `ArchivedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`TaskId`),
  KEY `IX_Tasks_CompanyId` (`CompanyId`),
  KEY `IX_Tasks_TeamId` (`TeamId`),
  KEY `IX_Tasks_AssignedToUserId` (`AssignedToUserId`),
  KEY `IX_Tasks_CreatedByUserId` (`CreatedByUserId`),
  KEY `IX_Tasks_TaskStatusId` (`TaskStatusId`),
  CONSTRAINT `FK_Tasks_AssignedToUser` FOREIGN KEY (`AssignedToUserId`) REFERENCES `Users` (`UserId`),
  CONSTRAINT `FK_Tasks_Companies` FOREIGN KEY (`CompanyId`) REFERENCES `Companies` (`CompanyId`),
  CONSTRAINT `FK_Tasks_CreatedByUser` FOREIGN KEY (`CreatedByUserId`) REFERENCES `Users` (`UserId`),
  CONSTRAINT `FK_Tasks_TaskStatuses` FOREIGN KEY (`TaskStatusId`) REFERENCES `TaskStatuses` (`TaskStatusId`),
  CONSTRAINT `FK_Tasks_Teams` FOREIGN KEY (`TeamId`) REFERENCES `Teams` (`TeamId`),
  CONSTRAINT `CK_Tasks_Priority` CHECK (`Priority` in ('Low','Medium','High','Critical')),
  CONSTRAINT `CK_Tasks_Complexity` CHECK (`Complexity` in ('Simple','Medium','Complex')),
  CONSTRAINT `CK_Tasks_Effort` CHECK (`EstimatedEffortHours` >= 0),
  CONSTRAINT `CK_Tasks_Weight` CHECK (`Weight` >= 0),
  CONSTRAINT `CK_Tasks_Dates` CHECK (`DueDate` >= `StartDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: TaskStatusHistory
CREATE TABLE `TaskStatusHistory` (
  `TaskStatusHistoryId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyId` int(11) NOT NULL,
  `TaskId` int(11) NOT NULL,
  `OldTaskStatusId` int(11) DEFAULT NULL,
  `NewTaskStatusId` int(11) NOT NULL,
  `ChangedByUserId` int(11) NOT NULL,
  `ChangedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `Feedback` longtext DEFAULT NULL,
  PRIMARY KEY (`TaskStatusHistoryId`),
  KEY `FK_TaskStatusHistory_Companies` (`CompanyId`),
  KEY `FK_TaskStatusHistory_Users` (`ChangedByUserId`),
  KEY `IX_TaskStatusHistory_TaskId` (`TaskId`),
  KEY `IX_TaskStatusHistory_OldTaskStatusId` (`OldTaskStatusId`),
  KEY `IX_TaskStatusHistory_NewTaskStatusId` (`NewTaskStatusId`),
  CONSTRAINT `FK_TaskStatusHistory_Companies` FOREIGN KEY (`CompanyId`) REFERENCES `Companies` (`CompanyId`),
  CONSTRAINT `FK_TaskStatusHistory_NewTaskStatuses` FOREIGN KEY (`NewTaskStatusId`) REFERENCES `TaskStatuses` (`TaskStatusId`),
  CONSTRAINT `FK_TaskStatusHistory_OldTaskStatuses` FOREIGN KEY (`OldTaskStatusId`) REFERENCES `TaskStatuses` (`TaskStatusId`),
  CONSTRAINT `FK_TaskStatusHistory_Tasks` FOREIGN KEY (`TaskId`) REFERENCES `Tasks` (`TaskId`),
  CONSTRAINT `FK_TaskStatusHistory_Users` FOREIGN KEY (`ChangedByUserId`) REFERENCES `Users` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: TaskChangeRequests
CREATE TABLE `TaskChangeRequests` (
  `TaskChangeRequestId` int(11) NOT NULL AUTO_INCREMENT,
  `CompanyId` int(11) NOT NULL,
  `TaskId` int(11) NOT NULL,
  `RequestedByUserId` int(11) NOT NULL,
  `ChangeType` varchar(100) NOT NULL,
  `OldTaskStatusId` int(11) DEFAULT NULL,
  `NewTaskStatusId` int(11) DEFAULT NULL,
  `OldValue` varchar(500) DEFAULT NULL,
  `NewValue` varchar(500) DEFAULT NULL,
  `RequestStatus` varchar(50) NOT NULL DEFAULT 'Pending',
  `ReviewedByUserId` int(11) DEFAULT NULL,
  `Reason` varchar(1000) DEFAULT NULL,
  `CreatedAt` datetime NOT NULL DEFAULT current_timestamp(),
  `ReviewedAt` datetime DEFAULT NULL,
  `ReviewNote` text DEFAULT NULL,
  PRIMARY KEY (`TaskChangeRequestId`),
  KEY `IX_TaskChangeRequests_Company_Task` (`CompanyId`,`TaskId`),
  KEY `IX_TaskChangeRequests_Task_RequestStatus` (`TaskId`,`RequestStatus`),
  KEY `IX_TaskChangeRequests_RequestedBy_CreatedAt` (`RequestedByUserId`,`CreatedAt`),
  KEY `FK_TaskChangeRequests_ReviewedByUser` (`ReviewedByUserId`),
  KEY `FK_TaskChangeRequests_OldTaskStatus` (`OldTaskStatusId`),
  KEY `FK_TaskChangeRequests_NewTaskStatus` (`NewTaskStatusId`),
  CONSTRAINT `FK_TaskChangeRequests_Company` FOREIGN KEY (`CompanyId`) REFERENCES `Companies` (`CompanyId`),
  CONSTRAINT `FK_TaskChangeRequests_NewTaskStatus` FOREIGN KEY (`NewTaskStatusId`) REFERENCES `TaskStatuses` (`TaskStatusId`),
  CONSTRAINT `FK_TaskChangeRequests_OldTaskStatus` FOREIGN KEY (`OldTaskStatusId`) REFERENCES `TaskStatuses` (`TaskStatusId`),
  CONSTRAINT `FK_TaskChangeRequests_RequestedByUser` FOREIGN KEY (`RequestedByUserId`) REFERENCES `Users` (`UserId`),
  CONSTRAINT `FK_TaskChangeRequests_ReviewedByUser` FOREIGN KEY (`ReviewedByUserId`) REFERENCES `Users` (`UserId`),
  CONSTRAINT `FK_TaskChangeRequests_Task` FOREIGN KEY (`TaskId`) REFERENCES `Tasks` (`TaskId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
