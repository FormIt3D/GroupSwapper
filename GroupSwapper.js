if (typeof GroupSwapper == 'undefined')
{
    GroupSwapper = {};
}

/*** web/UI code - runs natively in the plugin process ***/

// flag to indicate a selection is in progress
let bIsSelectionForMatchInProgress = false;
let bIsSelectionForChangeInProgress = false;

// IDs input elements that need to be referenced or updated
// match object section
const dynamoObjectToMatchDescriptionID = 'dynamoObjectToMatchDescription';
const dynamoObjectToMatchGroupNameID = 'dynamoObjectToMatchGroupName';
const dynamoObjectToMatchInputCountID = 'dynamoObjectToMatchInputCount';
// change object section
const dynamoObjectToChangeDescriptionID = 'dynamoObjectToChangeDescription';
const dynamoObjectToChangeGroupNameID = 'dynamoObjectToChangeGroupName';
const dynamoObjectToChangeInputCountID = 'dynamoObjectToChangeInputCount';
// review and apply section
const missingSelectionsDivID = 'noSelectionsDiv';
const incompatibleSelectionDivID = 'incompatibleSelectionDiv';
const identicalInputsDivID = 'identicalInputsDiv';
const reviewAndApplyDetailsDivID = 'reviewAndApplySection';
const affectedInputsCountID = 'affectedInputsCount';
const affectedInputsListID = 'affectedInputsList';

const selectionMessagePrefixText = 'Select a Group instance ';
const objectIDPrefixText = 'Dynamo History ID: ';
const groupNamePrefixText = 'Dynamo Group Name: ';
const inputCountPrefixText = 'Input Nodes: ';
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
    groupToCopyTitleDiv.id = dynamoObjectToMatchDescriptionID;
    contentContainer.appendChild(groupToCopyTitleDiv);

    // the name of the object to match
    let groupToCopyNameDiv = document.createElement('div');
    groupToCopyNameDiv.innerHTML = '';
    groupToCopyNameDiv.id = dynamoObjectToMatchGroupNameID;
    contentContainer.appendChild(groupToCopyNameDiv);

    // the group instance count
    let groupToCopyCountDiv = document.createElement('div');
    groupToCopyCountDiv.innerHTML = '';
    groupToCopyCountDiv.id = dynamoObjectToMatchInputCountID;
    contentContainer.appendChild(groupToCopyCountDiv);

    // create the button to select the object to match
    contentContainer.appendChild(new FormIt.PluginUI.Button('Select Group to Copy', GroupSwapper.getDynamoInputsToMatch).element);

    /* group to replace */

    // create the group to replace subheader
    let groupToReplaceSubheader = contentContainer.appendChild(document.createElement('p'));
    groupToReplaceSubheader.style = 'font-weight: bold;'
    groupToReplaceSubheader.innerHTML = 'Group to Replace';

    // the description of the object to change
    let groupToReplaceTitleDiv = document.createElement('div');
    groupToReplaceTitleDiv.innerHTML = notSetText;
    groupToReplaceTitleDiv.id = dynamoObjectToChangeDescriptionID;
    contentContainer.appendChild(groupToReplaceTitleDiv);

    // the name of the object to change
    let groupToReplaceNameDiv = document.createElement('div');
    groupToReplaceNameDiv.innerHTML = '';
    groupToReplaceNameDiv.id = dynamoObjectToChangeGroupNameID;
    contentContainer.appendChild(groupToReplaceNameDiv);

    // the group instance count
    let groupToReplaceCountDiv = document.createElement('div');
    groupToReplaceCountDiv.innerHTML = '';
    groupToReplaceCountDiv.id = dynamoObjectToChangeInputCountID;
    contentContainer.appendChild(groupToReplaceCountDiv);

    // create the button to select the object to change
    contentContainer.appendChild(new FormIt.PluginUI.Button('Select Group to Replace', GroupSwapper.getDynamoInputsToChange).element);

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

    // the list of inputs that will be affected, and how
    let affectedInputsCountDiv = document.createElement('div');
    affectedInputsCountDiv.innerHTML = affectedInputsPrefixText + dynamoInputNodesInCommon.length;
    affectedInputsCountDiv.id = affectedInputsCountID;
    reviewAndApplyDetailsDiv.appendChild(affectedInputsCountDiv);

    let affectedInputsListDiv = document.createElement('div');
    affectedInputsListDiv.id = affectedInputsListID;
    reviewAndApplyDetailsDiv.appendChild(affectedInputsListDiv)


    // create the button to apply the changes
    reviewAndApplyDetailsDiv.appendChild(new FormIt.PluginUI.Button('Apply Changes + Run', function()
    {


    }).element);

    // update the review and apply section if necessary
    await GroupSwapper.updateUIForComparisonCheck();

    // create the footer
    document.body.appendChild(new FormIt.PluginUI.FooterModule().element);
}

/*** update mechanisms for the match object section ***/

GroupSwapper.updateUIForCopyObject = async function()
{
    // try to get the selected history
    dynamoHistoryIDToMatch = await FormIt.Dynamo.GetSelectedDynamoHistory();
    dynamoGroupNameToMatch = await FormIt.Dynamo.GetDynamoGroupName(dynamoHistoryIDToMatch);
    dynamoInputNodesToMatch = await FormIt.Dynamo.GetInputNodes(dynamoHistoryIDToMatch, true);

    if (dynamoHistoryIDToMatch == 4294967295)
    {
        await GroupSwapper.setCopyObjectToUnsetState();
    }
    else
    {
        await GroupSwapper.setCopyObjectToActiveState();
    }
}

GroupSwapper.setCopyObjectToActiveState = async function()
{
    document.getElementById(dynamoObjectToMatchDescriptionID).innerHTML = objectIDPrefixText + dynamoHistoryIDToMatch;
    document.getElementById(dynamoObjectToMatchGroupNameID).innerHTML = groupNamePrefixText + dynamoGroupNameToMatch;
    document.getElementById(dynamoObjectToMatchInputCountID).innerHTML = inputCountPrefixText + dynamoInputNodesToMatch.length;

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
    document.getElementById(dynamoObjectToMatchDescriptionID).innerHTML = objectIDSelectingText;
    document.getElementById(dynamoObjectToMatchGroupNameID).innerHTML = '';
    document.getElementById(dynamoObjectToMatchInputCountID).innerHTML = '';
}

GroupSwapper.setCopyObjectToUnsetState = function()
{
    document.getElementById(dynamoObjectToMatchDescriptionID).innerHTML = notSetText;
    document.getElementById(dynamoObjectToMatchGroupNameID).innerHTML = '';
    document.getElementById(dynamoObjectToMatchInputCountID).innerHTML = '';

    bIsCopyObjectAvailable = false;
}

/*** update mechanisms for the change object section ***/

GroupSwapper.updateUIForReplaceObject = async function()
{
    // try to get the selected history
    dynamoHistoryIDToChange = await FormIt.Dynamo.GetSelectedDynamoHistory();
    dynamoGroupNameToChange = await FormIt.Dynamo.GetDynamoGroupName(dynamoHistoryIDToChange);
    dynamoInputNodesToChange = await FormIt.Dynamo.GetInputNodes(dynamoHistoryIDToChange, true);

    if (dynamoHistoryIDToChange == 4294967295)
    {
        await GroupSwapper.setReplaceObjectToUnsetState();
    }
    else
    {
        await GroupSwapper.setReplaceObjectToActiveState();
    }
}

GroupSwapper.setReplaceObjectToActiveState = async function()
{
    document.getElementById(dynamoObjectToChangeDescriptionID).innerHTML = objectIDPrefixText + dynamoHistoryIDToChange;
    document.getElementById(dynamoObjectToChangeGroupNameID).innerHTML = groupNamePrefixText + dynamoGroupNameToChange;
    document.getElementById(dynamoObjectToChangeInputCountID).innerHTML = inputCountPrefixText + dynamoInputNodesToChange.length;

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
    document.getElementById(dynamoObjectToChangeDescriptionID).innerHTML = objectIDSelectingText;
    document.getElementById(dynamoObjectToChangeGroupNameID).innerHTML = '';
    document.getElementById(dynamoObjectToChangeInputCountID).innerHTML = '';
}

GroupSwapper.setReplaceObjectToUnsetState = function()
{
    document.getElementById(dynamoObjectToChangeDescriptionID).innerHTML = notSetText;
    document.getElementById(dynamoObjectToChangeGroupNameID).innerHTML = '';
    document.getElementById(dynamoObjectToChangeInputCountID).innerHTML = '';

    bIsReplaceObjectAvailable = false;
}

/*** update mechanisms for the comparison section ***/

GroupSwapper.updateUIForComparisonCheck = async function()
{
    // if both the match object and change object are available
    if (bIsCopyObjectAvailable && bIsReplaceObjectAvailable)
    {
        await GroupSwapper.getInputsInCommon();

        // no common input nodes found between these two objects
        if(dynamoInputNodesInCommon.length == 0)
        {
            document.getElementById(reviewAndApplyDetailsDivID).className = 'hide';
            document.getElementById(incompatibleSelectionDivID).className = 'body';
            document.getElementById(missingSelectionsDivID).className = 'hide';
            document.getElementById(identicalInputsDivID).className = 'hide';

            console.log("No matching inputs found for comparison.");
        }
        // common input nodes were found
        else
        {
            // common nodes were found, but their values are identical
            if (dynamoInputNamesToModify.length == 0)
            {
                document.getElementById(reviewAndApplyDetailsDivID).className = 'hide';
                document.getElementById(missingSelectionsDivID).className = 'hide';
                document.getElementById(incompatibleSelectionDivID).className = 'hide';
                document.getElementById(identicalInputsDivID).className = 'body';
            }
            // common node values are different, so we can show the review & apply section
            else
            {
                document.getElementById(reviewAndApplyDetailsDivID).className = 'body';
                document.getElementById(missingSelectionsDivID).className = 'hide';
                document.getElementById(incompatibleSelectionDivID).className = 'hide';
                document.getElementById(identicalInputsDivID).className = 'hide';
    
                // enable and update the list of nodes that will be changed, and how
                document.getElementById(affectedInputsCountID).innerHTML = affectedInputsPrefixText + dynamoInputNamesToModify.length;

                let affectedInputsListDiv = document.getElementById(affectedInputsListID);
                
                // clear the list of affected inputs first
                while (affectedInputsListDiv.hasChildNodes()) {
                    affectedInputsListDiv.removeChild(affectedInputsListDiv.lastChild);
                }

                // create a series of unordered lists to display
                for (let i = 0; i < dynamoInputNamesToModify.length; i++)
                {
                    let ul = document.createElement('ul');
                    ul.innerHTML = dynamoInputNamesToModify[i];
                    affectedInputsListDiv.appendChild(ul);
                    ul.style.padding = '0px 0px 0px 0px';
                    ul.style.fontStyle = 'italic';

                    let ul2 = document.createElement('ul');
                    ul.appendChild(ul2);

                    let valueComparisonLi = document.createElement('li');
                    valueComparisonLi.className = 'codeSnippet';
                    valueComparisonLi.style.fontStyle = 'normal';
                    valueComparisonLi.innerHTML = dynamoInputValuesToModifyBefore[i] + ' \u279e ' + dynamoInputValuesToModifyAfter[i];
                    ul2.appendChild(valueComparisonLi);

                }
                
                console.log("Number of inputs to modify: " + dynamoInputNamesToModify.length);
            }
        }
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

let dynamoFileToMatch;
let dynamoHistoryIDToMatch;
let dynamoGroupNameToMatch;
let dynamoInputNodesToMatch;
let dynamoInputNodeGUIDsToMatch = new Array();
let dynamoInputNodeNamesToMatch = new Array();
let dynamoInputNodeValuesToMatch = new Array();

let dynamoFileToChange;
let dynamoHistoryIDToChange;
let dynamoGroupNameToChange;
let dynamoInputNodesToChange;
let dynamoInputNodeGUIDsToChange = new Array();
let dynamoInputNodeNamesToChange = new Array();
let dynamoInputNodeValuesToChange = new Array();

let dynamoInputNodesInCommon = new Array();

// only the nodes that have unique values to be changed
let dynamoInputGUIDsToModify = new Array();
let dynamoInputNamesToModify = new Array();
let dynamoInputValuesToModifyBefore = new Array();
let dynamoInputValuesToModifyAfter = new Array();

let GUIDsAndValuesToModify = {};

// get the current history, query the selection, and report the number of items successfully selected
GroupSwapper.tryGetDynamoObjectToMatch = async function()
{
    // get the Dynamo history ID from the selection
    dynamoHistoryIDToMatch = await FormIt.Dynamo.GetSelectedDynamoHistory();
    dynamoGroupNameToMatch = await FormIt.Dynamo.GetDynamoGroupName(dynamoHistoryIDToMatch);
    dynamoInputNodesToMatch = await FormIt.Dynamo.GetInputNodes(dynamoHistoryIDToMatch, true);

    // if the selection didn't return a valid object, put the user in a select mode
    if (dynamoHistoryIDToMatch == 4294967295)
    {
        await FormIt.Selection.ClearSelections();

        let message = selectionMessagePrefixText + "to copy";
        await FormIt.UI.ShowNotification(message, FormIt.NotificationType.Information, 0);
        console.log("\n" + message);

        bIsCopyObjectAvailable = false;
        bIsSelectionForMatchInProgress = true;

        GroupSwapper.setCopyObjectToSelectingState();
        await GroupSwapper.updateUIForComparisonCheck();

    }
    else
    {
        await GroupSwapper.setCopyObjectToActiveState();
    }
}

// get the current history, query the selection, and report the number of items successfully selected
GroupSwapper.tryGetDynamoObjectToChange = async function()
{
    // get the Dynamo history ID from the selection
    dynamoHistoryIDToChange = await FormIt.Dynamo.GetSelectedDynamoHistory();
    dynamoGroupNameToChange = await FormIt.Dynamo.GetDynamoGroupName(dynamoHistoryIDToChange);
    dynamoInputNodesToChange = await FormIt.Dynamo.GetInputNodes(dynamoHistoryIDToChange, true);

    // if the selection didn't return a valid object, put the user in a select mode
    if (dynamoHistoryIDToChange == 4294967295)
    {
        await FormIt.Selection.ClearSelections();

        let message = selectionMessagePrefixText + "to replace";
        await FormIt.UI.ShowNotification(message, FormIt.NotificationType.Information, 0);
        console.log("\n" + message);

        bIsReplaceObjectAvailable = false;
        bIsSelectionForChangeInProgress = true;

        GroupSwapper.setReplaceObjectToSelectingState();
        await GroupSwapper.updateUIForComparisonCheck();

    }
    else
    {
        await GroupSwapper.setReplaceObjectToActiveState();
    }
}

// get all input nodes from the Dynamo object to match
GroupSwapper.getDynamoInputsToMatch = async function()
{
    console.clear();
    console.log("Dynamo Eyedropper");

    // get the selection basics
    await GroupSwapper.tryGetDynamoObjectToMatch();

    // first, get selection basics to know whether we should even proceed
    if (dynamoHistoryIDToMatch == null)
    {
        return;
    }

    // if we get here, the selection is valid for the next steps
    dynamoInputNodesToMatch = await FormIt.Dynamo.GetInputNodes(dynamoHistoryIDToMatch, true);

    //console.log("Dynamo inputs: " + JSON.stringify(dynamoInputNodesToMatch));
}

// get all input nodes from the Dynamo object to match
GroupSwapper.getDynamoInputsToChange = async function()
{
    console.clear();
    console.log("Dynamo Eyedropper");

    // get the selection basics
    await GroupSwapper.tryGetDynamoObjectToChange();

    // first, get selection basics to know whether we should even proceed
    if (dynamoHistoryIDToChange == null)
    {
        return;
    }

    // if we get here, the selection is valid for the next steps
    dynamoInputNodesToChange = await FormIt.Dynamo.GetInputNodes(dynamoHistoryIDToChange, true);

    //console.log("Dynamo inputs: " + JSON.stringify(dynamoInputNodesToChange));
}

// get the inputs that are in common between the two selected Dynamo objects
GroupSwapper.getInputsInCommon = async function()
{
    // clear the arrays
    dynamoInputNodesInCommon = [];

    dynamoInputNodeGUIDsToMatch = [];
    dynamoInputNodeNamesToMatch = [];
    dynamoInputNodeValuesToMatch = [];

    dynamoInputNodeGUIDsToChange = [];
    dynamoInputNodeNamesToChange = [];
    dynamoInputNodeValuesToChange = [];

    dynamoInputGUIDsToModify = [];
    dynamoInputNamesToModify = [];
    dynamoInputValuesToModifyBefore = [];
    dynamoInputValuesToModifyAfter = [];

    GUIDsAndValuesToModify = { };

    dynamoFileToMatch = await FormIt.Dynamo.GetDynamoFile(dynamoHistoryIDToMatch);
    //console.log("Dynamo file to match: " + JSON.stringify(dynamoFileToMatch));
    dynamoFileToChange = await FormIt.Dynamo.GetDynamoFile(dynamoHistoryIDToChange);
    //console.log("Dynamo file to change: " + JSON.stringify(dynamoFileToChange));

    // only proceed if both objects are present
    if (!(bIsCopyObjectAvailable && bIsReplaceObjectAvailable))
    {
        return;
    }

    // for each input node in the list to match,
    // look for the same element by name in the list of input nodes to change
    dynamoInputNodesToMatch.forEach(inputNodeToMatch => {

        dynamoInputNodesToChange.forEach(inputNodeToChange => {

            let inputNodeNameToMatch = inputNodeToMatch[1];
            let inputNodeNameToChange = inputNodeToChange[1];
    
            // only record data if the names match
            if (inputNodeNameToMatch == inputNodeNameToChange)
            {
                // nodes
                dynamoInputNodesInCommon.push(inputNodeToChange);
    
                // GUIDs
                dynamoInputNodeGUIDsToMatch.push(inputNodeToMatch[0]);
                dynamoInputNodeGUIDsToChange.push(inputNodeToChange[0]);
    
                // names
                dynamoInputNodeNamesToMatch.push(inputNodeToMatch[1]);
                dynamoInputNodeNamesToChange.push(inputNodeToChange[1]);
    
                // values
                dynamoInputNodeValuesToMatch.push(GroupSwapper.getNodeInputValue(dynamoFileToMatch, inputNodeToMatch[0]));
                dynamoInputNodeValuesToChange.push(GroupSwapper.getNodeInputValue(dynamoFileToChange, inputNodeToChange[0]));
            }

        });
    });

    // for each of the match values, determine if any are different from the change values
    for (let j = 0; j < dynamoInputNodeValuesToChange.length; j++)
    {
        // if the values are different, push data to various arrays
        if (dynamoInputNodeValuesToMatch[j] != dynamoInputNodeValuesToChange[j])
        {
            dynamoInputGUIDsToModify.push(dynamoInputNodeGUIDsToChange[j]);
            dynamoInputNamesToModify.push(dynamoInputNodeNamesToChange[j]);
            dynamoInputValuesToModifyBefore.push(dynamoInputNodeValuesToChange[j]);
            dynamoInputValuesToModifyAfter.push(dynamoInputNodeValuesToMatch[j]);
        }
    }

    GUIDsAndValuesToModify = GroupSwapper.createNodesAndValuesObject(dynamoInputGUIDsToModify, dynamoInputValuesToModifyAfter);

    console.log("Before values: " + dynamoInputValuesToModifyBefore);
    console.log("After values: " + dynamoInputValuesToModifyAfter);
}

// get the input value from the node GUID in the given Dynamo file
// TODO: replace this with new FormIt.Dynamo.GetInputNode(nHistoryId, GUID) after v22 ships
// see FORMIT-11493
GroupSwapper.getNodeInputValue = function(dynFile, nodeGUID)
{    
    for (let i = 0; i < dynFile.Nodes.length; i++)
    {
        let node = dynFile.Nodes[i];
        if (node["Id"] == nodeGUID)
        {
            return node["InputValue"];
        }
    }
}

GroupSwapper.createNodesAndValuesObject = function(arrayOfGUIDs, arrayOfValues)
{
    var object = {};

    for (let i = 0; i < arrayOfGUIDs.length; i++)
    {
        let guid = arrayOfGUIDs[i];
        let value = arrayOfValues[i];

        object[guid] = value;
        //let newObject = { "arrayOfGUIDs": arrayOfGUIDs[i], "arrayOfValues" : arrayOfValues[i] };
    }

    return object;
}