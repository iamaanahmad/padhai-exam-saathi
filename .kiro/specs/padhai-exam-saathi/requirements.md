# Requirements Document

## Introduction

PadhAI (ExamSaathi) is a mobile-first web application that helps Indian students (Classes 10-12, JEE/NEET, university) convert a photographed textbook page, photographed handwritten notes, or a typed question into a simple explanation, a set of practice questions, and a revision suggestion. The system uses Amazon Bedrock multimodal analysis to generate results in Hindi or English, and lets a student save results to a personal history list for later review. This spec covers the strict MVP scope for the "First Commit" hackathon Ship It track: upload, analysis, structured result display, language toggle, save-to-history, history viewing, and baseline error/loading handling. Full curriculum coverage, accounts beyond optional anonymous/email login, spaced repetition, multi-page PDF/OCR, admin tooling, payments, and large-scale RAG are explicitly out of scope.

## Glossary

- **Student**: The end user of PadhAI, accessing the application from a mobile phone or laptop browser.
- **Upload_Interface**: The frontend screen where a Student submits an image or typed text as study material.
- **Analysis_Service**: The backend component (API Gateway + Lambda) that receives study material and orchestrates the call to the Bedrock_Model.
- **Bedrock_Model**: The Amazon Bedrock multimodal model (e.g. Claude 3.5 Sonnet/Claude 4 or Amazon Nova) that generates the explanation, practice questions, and revision suggestion from study material.
- **Study_Result**: The structured output consisting of an explanation, 3-5 practice questions with short answers, and one revision suggestion, in a selected language.
- **Language_Toggle**: The UI control that lets a Student choose Hindi or English for the Study_Result.
- **History_Store**: The DynamoDB table that persists saved Study_Results for a Student.
- **History_List**: The frontend screen that displays a Student's previously saved Study_Results ("Weak Topics / History").
- **Image_Store**: The S3 bucket used for temporary storage of uploaded images before and during analysis.
- **Session_Identity**: The identifier (session-based or optional Cognito-based) used to associate uploads and history entries with a single Student.

## Requirements

### Requirement 1: Upload Study Material

**User Story:** As a Student, I want to upload a photo of a textbook page or handwritten notes, or paste a typed question, so that I can get help understanding it without retyping content.

#### Acceptance Criteria

1. THE Upload_Interface SHALL provide an option to upload an image file and an option to enter typed text.
2. THE Upload_Interface SHALL accept image files of type JPG or PNG for upload.
3. IF a Student selects a file that is not JPG or PNG, THEN THE Upload_Interface SHALL reject the file and display a message stating the accepted file types.
4. IF a Student selects an image file larger than 10 MB, THEN THE Upload_Interface SHALL reject the file and display a message stating the maximum file size.
5. IF an uploaded image file is corrupted or fails to load, THEN THE Upload_Interface SHALL reject the file and display a message indicating the file could not be processed.
6. THE Upload_Interface SHALL accept a typed text input with a length between 1 and 5000 characters.
7. IF a Student enters typed text exceeding 5000 characters, THEN THE Upload_Interface SHALL prevent submission and display a message stating the maximum character limit.
8. IF a Student attempts to submit without providing an image or text, THEN THE Upload_Interface SHALL prevent submission and display a message prompting for input.
9. THE Upload_Interface SHALL display the Language_Toggle before submission, offering a choice between Hindi and English.
10. THE Upload_Interface SHALL default the Language_Toggle to English.
11. WHEN a Student submits a valid image or text input, THE Upload_Interface SHALL accept the submission and proceed to processing.

### Requirement 2: Generate Study Result via Bedrock

**User Story:** As a Student, I want the uploaded material analyzed automatically, so that I receive an explanation, practice questions, and a revision suggestion without manual effort.

#### Acceptance Criteria

1. WHEN a Student submits an image or text with a selected language, THE Analysis_Service SHALL send the study material and language selection to the Bedrock_Model.
2. WHEN the Bedrock_Model returns a response, THE Analysis_Service SHALL parse the response into a Study_Result containing one explanation of no more than 300 words, between 3 and 5 practice questions each with an answer of no more than 50 words, and one revision suggestion of no more than 50 words.
3. THE Analysis_Service SHALL return the Study_Result entirely in the single language (Hindi or English) selected via the Language_Toggle, with no mixing of the other language within the same Study_Result.
4. WHILE the Analysis_Service is awaiting the Bedrock_Model response, THE Upload_Interface SHALL display a loading state.
5. THE Analysis_Service SHALL return the completed Study_Result to the Upload_Interface within 10 seconds of submission for inputs not exceeding the maximum size accepted by the Upload_Interface.
6. IF the Bedrock_Model returns an error or an unparseable response, THEN THE Analysis_Service SHALL return an error indication to the Upload_Interface without a partial Study_Result.
7. IF the Analysis_Service does not receive a Bedrock_Model response within 15 seconds, THEN THE Analysis_Service SHALL terminate the request and return a timeout error indication to the Upload_Interface without a partial Study_Result.
8. WHEN the Upload_Interface receives an error indication, THE Upload_Interface SHALL display a message describing that the analysis failed and an option to retry.
9. WHEN the Student selects the retry option, THE Upload_Interface SHALL resubmit the original study material and language selection to the Analysis_Service as a new request.

### Requirement 3: Temporary Image Storage

**User Story:** As a Student, I want my uploaded images handled securely and temporarily, so that my study material is not retained longer than necessary.

#### Acceptance Criteria

1. WHEN a Student uploads an image, THE Analysis_Service SHALL store the image in the Image_Store before invoking the Bedrock_Model.
2. IF the Analysis_Service fails to store an uploaded image in the Image_Store, THEN THE Analysis_Service SHALL NOT invoke the Bedrock_Model and SHALL return to the Student an error response indicating that the image could not be saved, without persisting a partial object in the Image_Store.
3. THE Image_Store SHALL apply a lifecycle rule that deletes objects automatically no more than 24 hours after creation.
4. WHEN the Analysis_Service finishes processing an uploaded image, regardless of whether the Bedrock_Model invocation succeeds or fails, THE Analysis_Service SHALL delete the corresponding object from the Image_Store, independent of the lifecycle rule in Criterion 3.
5. THE Image_Store SHALL deny public read and public write access to uploaded objects.

### Requirement 4: Display Structured Result

**User Story:** As a Student, I want to see my explanation, practice questions, and revision suggestion in a clean layout, so that I can study the material easily on my phone.

#### Acceptance Criteria

1. WHEN the Upload_Interface receives a Study_Result containing an explanation, 3 to 5 practice questions with short answers, and one revision suggestion, THE Upload_Interface SHALL display the explanation, the practice questions with their short answers, and the revision suggestion as three visually distinct, separately labeled sections in that order.
2. THE Upload_Interface SHALL render the result view using a mobile-first layout in which all interactive controls (buttons, toggles, links) have a minimum touch target size of 44x44 pixels and body text is displayed at a minimum font size of 16 pixels, across screen widths from 320px to 480px.
3. WHILE a Study_Result is displayed, WHEN a Student changes the Language_Toggle, THE Upload_Interface SHALL display a loading indicator and request a new Study_Result in the newly selected language, replacing the previously displayed sections once the new Study_Result is received.
4. IF the Upload_Interface receives a Study_Result that is missing the explanation, the practice questions, or the revision suggestion, THEN THE Upload_Interface SHALL display an error message indicating the result could not be displayed and SHALL retain the previously displayed Study_Result, if any.

### Requirement 5: Save Result to History

**User Story:** As a Student, I want to save a Study_Result to my history, so that I can revisit weak topics later.

#### Acceptance Criteria

1. WHEN a Student selects the save action on a displayed Study_Result, THE Analysis_Service SHALL write the Study_Result, its language, and a creation timestamp as a new entry to the History_Store associated with the Student's Session_Identity, without checking for or deduplicating against prior entries.
2. WHEN a Study_Result is successfully written to the History_Store, THE Upload_Interface SHALL display a distinct, observable confirmation indicator that the item was saved.
3. IF the write to the History_Store does not complete within 5 seconds or returns an error, THEN THE Upload_Interface SHALL display a message stating the save failed, retain the displayed Study_Result, and offer an option to retry the save.
4. THE History_Store SHALL deny public read and public write access, permitting access only through the Analysis_Service.

### Requirement 6: View History List

**User Story:** As a Student, I want to view my previously saved study results, so that I can review weak topics I've studied before.

#### Acceptance Criteria

1. WHEN a Student opens the History_List, THE Analysis_Service SHALL retrieve up to 50 most recently created saved Study_Results associated with the Student's Session_Identity from the History_Store, ordered by creation timestamp in descending order.
2. WHEN the History_List begins retrieving saved Study_Results, THE History_List SHALL display a loading indicator until the retrieval completes or fails.
3. THE History_List SHALL display each saved item with its creation timestamp and a short identifying label of at most 60 characters derived from the explanation.
4. WHEN a Student selects a saved item in the History_List, THE History_List SHALL display the full explanation, practice questions, and revision suggestion for that item.
5. IF the Student's Session_Identity has no saved items, THEN THE History_List SHALL display a message indicating the history is empty.
6. IF the retrieval from the History_Store fails, THEN THE History_List SHALL display a message stating the history could not be loaded and an option to retry.
7. WHEN the Student selects the retry option, THE Analysis_Service SHALL reattempt retrieval of the saved Study_Results associated with the Student's Session_Identity from the History_Store.

### Requirement 7: Session Identity

**User Story:** As a Student, I want my uploads and history tied to my own session, so that I don't see other students' study results.

#### Acceptance Criteria

1. WHEN a Student accesses the application and no existing Session_Identity is found in that Student's browser, THE Analysis_Service SHALL generate a unique Session_Identity and persist it in the Student's browser for reuse across subsequent visits.
2. WHEN a Student accesses the application and an existing, valid Session_Identity is found in that Student's browser, THE Analysis_Service SHALL reuse that Session_Identity instead of generating a new one.
3. IF the Analysis_Service cannot generate or persist a Session_Identity for a Student, THEN THE Analysis_Service SHALL display an error message indicating that the session could not be established and SHALL prevent upload and save actions until a Session_Identity is available.
4. THE Analysis_Service SHALL use the Session_Identity as the partition key for all Study_Result writes to the History_Store, such that each Study_Result is associated with exactly one Session_Identity.
5. WHEN a Student requests their History, THE Analysis_Service SHALL return only Study_Result records whose partition key matches the requesting Student's Session_Identity.
6. WHERE optional Cognito-based login is enabled, THE Analysis_Service SHALL use the authenticated user identifier as the Session_Identity in place of an anonymous session identifier for all subsequent writes and reads.

### Requirement 8: Public Availability and Baseline Reliability

**User Story:** As a judge or Student, I want to access PadhAI at a public URL with no setup, so that I can use the application immediately.

#### Acceptance Criteria

1. THE Upload_Interface SHALL be reachable via a public HTTPS URL requiring no local setup or credentials to load the Upload_Interface.
2. IF a Student's device loses network connectivity during a request, THEN THE Upload_Interface SHALL display a message indicating the connection was lost and an option to retry.
3. IF a request to the Analysis_Service fails due to a backend error, a request timeout, or an HTTP server error response, THEN THE Upload_Interface SHALL display a message indicating that the request could not be completed and an option to retry.
4. WHEN a Student selects the retry option after a connectivity or backend failure, THE Upload_Interface SHALL resubmit the request using the Student's previously entered image or text and previously selected language, without requiring the Student to re-enter that input.
5. THE Analysis_Service SHALL be implemented using on-demand compute (API Gateway and Lambda) with no continuously running server process.
