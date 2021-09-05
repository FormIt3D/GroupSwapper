if (typeof GroupSwapper == 'undefined')
{
    GroupSwapper = {};
}

/*** web/UI code - runs natively in the plugin process ***/

// flag to indicate a selection is in progress
let bIsSelectionForCopyInProgress = false;
let bIsSelectionForReplaceInProgress = false;

// IDs input elements that need to be referenced or updated
// copy object section
const copyObjectDescriptionID = 'copyObjectDescription';
const copyObjectGroupNameID = 'copyObjectGroupName';
const copyObjectInstanceCountID = 'bopyObjectInstanceCount';
// replace object section
const replaceObjectDescriptionID = 'replaceObjectDescription';
const replaceObjectGroupNameID = 'replaceObjectGroupName';
const replaceObjectInstanceCountID = 'replaceObjectInstanceCount';
// review and apply section
const missingSelectionsDivID = 'noSelectionsDiv';
const incompatibleSelectionDivID = 'incompatibleSelectionDiv';
const identicalInputsDivID = 'identicalInputsDiv';
const reviewAndApplyDetailsDivID = 'reviewAndApplySection';
const affectedInputsCountID = 'affectedInputsCount';
const affectedInputsListID = 'affectedInputsList';

const selectionMessagePrefixText = 'Select a Group instance ';
const historyIDPrefixText = 'History ID: ';
const groupNamePrefixText = 'Name: ';
const identicalInstancePrefixText = 'Identical instances in model: ';
const affectedInputsPrefixText = 'Inputs to be modified: ';
const affectedInputsListPrefixText = 'Names and values: \n';
const objectIDSelectingText = 'Selecting...';
const notSetText = '(not set)';

GroupSwapper.initializeUI = async function()
{
    // create an overall container for all objects that comprise the "content" of the plugin
    // everything except the footer
    let contentContainer = document.createElement('div');
    contentContainer.id = 'contentContainer';
    contentContainer.className = 'contentContainer'
    contentContainer.style.overflowY = 'scroll';
    window.document.body.appendChild(contentContainer);

    // create the header
    contentContainer.appendChild(new FormIt.PluginUI.HeaderModule('Group Swapper', 'Replace all instances of one Group with another.').element);

    /* group to copy */

    // create the object to match subheader
    let groupToCopySubheader = contentContainer.appendChild(document.createElement('p'));
    groupToCopySubheader.style = 'font-weight: bold;'
    groupToCopySubheader.innerHTML = 'Group to Copy';
    
    // the description of the object to match
    let groupToCopyTitleDiv = document.createElement('div');
    groupToCopyTitleDiv.innerHTML = notSetText;
    groupToCopyTitleDiv.id = copyObjectDescriptionID;
    contentContainer.appendChild(groupToCopyTitleDiv);

    // the name of the object to match
    let groupToCopyNameDiv = document.createElement('div');
    groupToCopyNameDiv.innerHTML = '';
    groupToCopyNameDiv.id = copyObjectGroupNameID;
    contentContainer.appendChild(groupToCopyNameDiv);

    // the group instance count
    let groupToCopyCountDiv = document.createElement('div');
    groupToCopyCountDiv.innerHTML = '';
    groupToCopyCountDiv.id = copyObjectInstanceCountID;
    contentContainer.appendChild(groupToCopyCountDiv);

    // create the button to select the object to match
    contentContainer.appendChild(new FormIt.PluginUI.Button('Select Group to Copy', GroupSwapper.tryGetGroupToCopy).element);

    /* group to replace */

    // create the group to replace subheader
    let groupToReplaceSubheader = contentContainer.appendChild(document.createElement('p'));
    groupToReplaceSubheader.style = 'font-weight: bold;'
    groupToReplaceSubheader.innerHTML = 'Group to Replace';

    // the description of the object to change
    let groupToReplaceTitleDiv = document.createElement('div');
    groupToReplaceTitleDiv.innerHTML = notSetText;
    groupToReplaceTitleDiv.id = replaceObjectDescriptionID;
    contentContainer.appendChild(groupToReplaceTitleDiv);

    // the name of the object to change
    let groupToReplaceNameDiv = document.createElement('div');
    groupToReplaceNameDiv.innerHTML = '';
    groupToReplaceNameDiv.id = replaceObjectGroupNameID;
    contentContainer.appendChild(groupToReplaceNameDiv);

    // the group instance count
    let groupToReplaceCountDiv = document.createElement('div');
    groupToReplaceCountDiv.innerHTML = '';
    groupToReplaceCountDiv.id = replaceObjectInstanceCountID;
    contentContainer.appendChild(groupToReplaceCountDiv);

    // create the button to select the object to change
    contentContainer.appendChild(new FormIt.PluginUI.Button('Select Group to Replace', GroupSwapper.tryGetGroupToReplace).element);

    // create affected inputs subheader
    let reviewAndApplySubheader = contentContainer.appendChild(document.createElement('p'));
    reviewAndApplySubheader.style = 'font-weight: bold;'
    reviewAndApplySubheader.innerHTML = 'Review and Apply Changes';

    // when not all selections have been fulfilled
    let missingSelectionsDiv = contentContainer.appendChild(document.createElement('p'));
    missingSelectionsDiv.innerHTML = 'Select objects above to continue.';
    missingSelectionsDiv.id = missingSelectionsDivID;
    contentContainer.appendChild(missingSelectionsDiv);

    // when the selections are fulfilled, but incompatible
    let incompatibleSelectionsDiv = contentContainer.appendChild(document.createElement('p'));
    incompatibleSelectionsDiv.innerHTML = 'No common inputs found in the selected Dynamo objects.';
    incompatibleSelectionsDiv.id = incompatibleSelectionDivID;
    contentContainer.appendChild(incompatibleSelectionsDiv);

    // when the selections are fulfilled, compatible, but identical
    let identicalInputsDiv = contentContainer.appendChild(document.createElement('p'));
    identicalInputsDiv.innerHTML = 'All input values are identical.';
    identicalInputsDiv.id = identicalInputsDivID;
    contentContainer.appendChild(identicalInputsDiv);

    // create the affected inputs container
    // will be hidden until both selections are valid
    let reviewAndApplyDetailsDiv = contentContainer.appendChild(document.createElement('div'));
    reviewAndApplyDetailsDiv.id = reviewAndApplyDetailsDivID;


    // create the button to apply the changes
    reviewAndApplyDetailsDiv.appendChild(new FormIt.PluginUI.Button('Apply Changes + Run', function()
    {


    }).element);

    // update the review and apply section if necessary
    await GroupSwapper.updateUIForComparisonCheck();

    // create the footer
    document.body.appendChild(new FormIt.PluginUI.FooterModule().element);
}

/*** update mechanisms for the copy object section ***/

GroupSwapper.updateUIForCopyObject = async function()
{
    GroupSwapper.tryGetGroupToCopy();
}

GroupSwapper.setCopyObjectToActiveState = async function(copyObjectData)
{    
    document.getElementById(copyObjectDescriptionID).innerHTML = historyIDPrefixText + copyObjectData.nGroupHistoryID;
    document.getElementById(copyObjectGroupNameID).innerHTML = groupNamePrefixText + copyObjectData.groupName;
    document.getElementById(copyObjectInstanceCountID).innerHTML = identicalInstancePrefixText + copyObjectData.nIdenticalInstanceCount;

    bIsCopyObjectAvailable = true;

    if (bIsCopyObjectAvailable && bIsReplaceObjectAvailable)
    {
        console.log("Both objects are present, starting comparison check...");

        await GroupSwapper.updateUIForComparisonCheck();
    }
    else
    {
        console.log("Missing one or more objects for comparison.");
    }
}

GroupSwapper.setCopyObjectToSelectingState = function()
{
    document.getElementById(copyObjectDescriptionID).innerHTML = objectIDSelectingText;
    document.getElementById(copyObjectGroupNameID).innerHTML = '';
    document.getElementById(copyObjectInstanceCountID).innerHTML = '';
}

GroupSwapper.setCopyObjectToUnsetState = function()
{
    document.getElementById(copyObjectDescriptionID).innerHTML = notSetText;
    document.getElementById(copyObjectGroupNameID).innerHTML = '';
    document.getElementById(copyObjectInstanceCountID).innerHTML = '';

    bIsCopyObjectAvailable = false;
}

/*** update mechanisms for the replacement object section ***/

GroupSwapper.updateUIForReplaceObject = async function()
{
    GroupSwapper.tryGetGroupToReplace();
}

GroupSwapper.setReplaceObjectToActiveState = async function(replaceObjectData)
{
    document.getElementById(replaceObjectDescriptionID).innerHTML = historyIDPrefixText + replaceObjectData.nGroupHistoryID;
    document.getElementById(replaceObjectGroupNameID).innerHTML = groupNamePrefixText + replaceObjectData.groupName;
    document.getElementById(replaceObjectInstanceCountID).innerHTML = identicalInstancePrefixText + replaceObjectData.nIdenticalInstanceCount;

    bIsReplaceObjectAvailable = true;

    if (bIsCopyObjectAvailable && bIsReplaceObjectAvailable)
    {
        console.log("Both objects are present, starting comparison check...");

        await GroupSwapper.updateUIForComparisonCheck();
    }
    else
    {
        console.log("Missing one or more objects for comparison.");
    }
}

GroupSwapper.setReplaceObjectToSelectingState = function()
{
    document.getElementById(replaceObjectDescriptionID).innerHTML = objectIDSelectingText;
    document.getElementById(replaceObjectGroupNameID).innerHTML = '';
    document.getElementById(replaceObjectInstanceCountID).innerHTML = '';
}

GroupSwapper.setReplaceObjectToUnsetState = function()
{
    document.getElementById(replaceObjectDescriptionID).innerHTML = notSetText;
    document.getElementById(replaceObjectGroupNameID).innerHTML = '';
    document.getElementById(replaceObjectInstanceCountID).innerHTML = '';

    bIsReplaceObjectAvailable = false;
}

/*** update mechanisms for the comparison section ***/

GroupSwapper.updateUIForComparisonCheck = async function()
{
    // if both the copy object and replace object are available
    if (bIsCopyObjectAvailable && bIsReplaceObjectAvailable)
    {

    }
    // missing one or both objects
    else
    {
        document.getElementById(missingSelectionsDivID).className = 'body';
        document.getElementById(incompatibleSelectionDivID).className = 'hide';
        document.getElementById(reviewAndApplyDetailsDivID).className = 'hide';
        document.getElementById(identicalInputsDivID).className = 'hide';
    }

}

/*** application code - runs asynchronously from plugin process to communicate with FormIt ***/

// dynamo data
let bIsCopyObjectAvailable;
let bIsReplaceObjectAvailable;

GroupSwapper.getSelectedInstanceData = async function()
{
    // get current history
    nHistoryID = await FormIt.GroupEdit.GetEditingHistoryID();

    // get current selection
    aCurrentSelection = await FormIt.Selection.GetSelections();

    // only one object should be selected
    if (aCurrentSelection.length == 1)
    {
        // if you're not in the Main History, calculate the depth to extract the correct history data
        historyDepth = (aCurrentSelection[0]["ids"].length) - 1;

        // get objectID of the current selection
        let nObjectID = aCurrentSelection[0]["ids"][historyDepth]["Object"];

        // get object type of the current selection
        let nType = await WSM.APIGetObjectTypeReadOnly(nHistoryID, nObjectID);

        // get group instance info, if there are any selected, and push the results into arrays
        if (nType == WSM.nObjectType.nInstanceType)
        {
            // get the Group family ID
            let aGroupIDs = await WSM.APIGetObjectsByTypeReadOnly(nHistoryID, nObjectID, WSM.nObjectType.nGroupType, true);
            let nGroupID = aGroupIDs[0];

            // get the Group family History ID
            let nGroupHistoryID = await WSM.APIGetGroupReferencedHistoryReadOnly(nHistoryID, nGroupID);

            // get the Group family name
            //let groupName = PropertiesPlus.getGroupFamilyName(nGroupHistoryID);
            let groupName = "Test";

            let nGroupReferenceHistoryID = await WSM.APIGetGroupReferencedHistoryReadOnly(nHistoryID, nGroupID);
            //console.log("Reference history for this Group: " + referenceHistoryID);
    
            // determine how many total instances of this Group are in the model
            let identicalGroupInstanceObject = await WSM.APIGetAllAggregateTransf3dsReadOnly(nGroupReferenceHistoryID, 0);
            let nIdenticalInstanceCount = identicalGroupInstanceObject.paths.length;
            console.log("Number of instances in model: " + nIdenticalInstanceCount);

            // return an object with the instance data
            return {
                "nGroupID": nGroupID, 
                "nGroupHistoryID" : nGroupHistoryID,
                "nGroupReferenceHistoryID" : nGroupReferenceHistoryID,
                "groupName" : groupName,
                "nIdenticalInstanceCount" : nIdenticalInstanceCount
            };
        }
    }
}

// get the current history, query the selection, and report the number of items successfully selected
GroupSwapper.tryGetGroupToCopy = async function()
{
    let selectedInstanceProperties = await GroupSwapper.getSelectedInstanceData();
    //await FormIt.ConsoleLog("Test! " + (JSON.stringify(propertiesObject)));
    
    if (selectedInstanceProperties)
    {
        await GroupSwapper.setCopyObjectToActiveState(selectedInstanceProperties);
    }
    // if the selection isn't valid, put the user in select mode
    else
    {
        await FormIt.Selection.ClearSelections();

        let message = selectionMessagePrefixText + "to copy";
        await FormIt.UI.ShowNotification(message, FormIt.NotificationType.Information, 0);
        console.log("\n" + message);

        bIsCopyObjectAvailable = false;
        bIsSelectionForCopyInProgress = true;

        GroupSwapper.setCopyObjectToSelectingState();
        await GroupSwapper.updateUIForComparisonCheck();
    }
}

// get the current history, query the selection, and report the number of items successfully selected
GroupSwapper.tryGetGroupToReplace = async function()
{
    let selectedInstanceProperties = await GroupSwapper.getSelectedInstanceData();
    //await FormIt.ConsoleLog("Test! " + (JSON.stringify(propertiesObject)));
    
    if (selectedInstanceProperties)
    {
        await GroupSwapper.setReplaceObjectToActiveState(selectedInstanceProperties);
    }
    // if the selection isn't valid, put the user in select mode
    else
    {
        await FormIt.Selection.ClearSelections();

        let message = selectionMessagePrefixText + "to replace";
        await FormIt.UI.ShowNotification(message, FormIt.NotificationType.Information, 0);
        console.log("\n" + message);

        bIsReplaceObjectAvailable = false;
        bIsSelectionForReplaceInProgress = true;

        GroupSwapper.setReplaceObjectToSelectingState();
        await GroupSwapper.updateUIForComparisonCheck();
    }

    return;


    // get the Dynamo history ID from the selection
    nHistoryIDToReplace = await FormIt.Dynamo.GetSelectedDynamoHistory();
    historyNameToReplace = await FormIt.Dynamo.GetDynamoGroupName(nHistoryIDToReplace);
    dynamoInputNodesToChange = await FormIt.Dynamo.GetInputNodes(nHistoryIDToReplace, true);

    // if the selection didn't return a valid object, put the user in a select mode
    if (nHistoryIDToReplace == 4294967295)
    {
        await FormIt.Selection.ClearSelections();

        let message = selectionMessagePrefixText + "to replace";
        await FormIt.UI.ShowNotification(message, FormIt.NotificationType.Information, 0);
        console.log("\n" + message);

        bIsReplaceObjectAvailable = false;
        bIsSelectionForReplaceInProgress = true;

        GroupSwapper.setReplaceObjectToSelectingState();
        await GroupSwapper.updateUIForComparisonCheck();

    }
    else
    {
        await GroupSwapper.setReplaceObjectToActiveState();
    }
}