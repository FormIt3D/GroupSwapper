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
const copyObjectGroupNameID = 'copyObjectGroupName';
const copyObjectInstanceCountID = 'bopyObjectInstanceCount';
// replace object section
const replaceObjectGroupNameID = 'replaceObjectGroupName';
const replaceObjectInstanceCountID = 'replaceObjectInstanceCount';
// review and apply section
const missingSelectionsDivID = 'noSelectionsDiv';
const incompatibleSelectionDivID = 'incompatibleSelectionDiv';
const identicalInputsDivID = 'identicalInputsDiv';
const reviewAndApplyDivID = 'reviewAndApplySection';
const reviewAndApplyDetailsDivID = 'reviewAndApplyDetails';

const selectionMessagePrefixText = 'Select a Group instance ';
const historyIDPrefixText = 'ID: ';
const groupNamePrefixText = '';
const identicalInstancePrefixText = 'Instances in model: ';
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

    // the name of the object to copy
    let groupToCopyNameDiv = document.createElement('div');
    groupToCopyNameDiv.innerHTML = notSetText;
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

    // the name of the object to change
    let groupToReplaceNameDiv = document.createElement('div');
    groupToReplaceNameDiv.innerHTML = notSetText;
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
    incompatibleSelectionsDiv.innerHTML = 'These Groups are the same. Select a different Group for each of the two buttons above.';
    incompatibleSelectionsDiv.id = incompatibleSelectionDivID;
    contentContainer.appendChild(incompatibleSelectionsDiv);

    // when the selections are fulfilled, compatible, but identical
    let identicalInputsDiv = contentContainer.appendChild(document.createElement('p'));
    identicalInputsDiv.innerHTML = 'All input values are identical.';
    identicalInputsDiv.id = identicalInputsDivID;
    contentContainer.appendChild(identicalInputsDiv);

    // create the affected inputs container
    // will be hidden until both selections are valid
    let reviewAndApplyDiv = contentContainer.appendChild(document.createElement('div'));
    reviewAndApplyDiv.id = reviewAndApplyDivID;

    let reviewAndApplyDetailsDiv = reviewAndApplyDiv.appendChild(document.createElement('div'));
    reviewAndApplyDetailsDiv.id = reviewAndApplyDetailsDivID;

    // create the button to apply the changes
    reviewAndApplyDiv.appendChild(new FormIt.PluginUI.Button('Apply Changes', async function()
    {
        await FormIt.UndoManagement.BeginState();

        // for each of the instances to be replaced, copy the selected instance to that location, then delete the original
        for (var i = 0; i < nReplaceObjectInstanceCount; i++)
        {
            let nReplaceObjectHistoryDepth = aReplaceObjectInstances["paths"][i]["ids"].length - 1;
            let nReplaceObjectInstanceID = aReplaceObjectInstances["paths"][i]["ids"][nReplaceObjectHistoryDepth]["Object"];
            let nReplaceObjectHistoryID = aReplaceObjectInstances["paths"][i]["ids"][nReplaceObjectHistoryDepth]["History"];
            let nReplaceObjectContextHistoryID = aReplaceObjectInstances["paths"][i]["ids"][0]["History"];
            let replaceObjectInstanceTransform = await WSM.APIGetInstanceTransf3dReadOnly(nReplaceObjectHistoryID, nReplaceObjectInstanceID);
            //await FormIt.ConsoleLog(JSON.stringify(aReplaceObjectInstances));

            // create new instances of the copy object, transformed to match the replacement object
            await WSM.APIAddInstancesToGroup(nReplaceObjectHistoryID, nCopyObjectGroupID, replaceObjectInstanceTransform);

            // delete the instance that has now been replaced
            await WSM.APIDeleteObject(nReplaceObjectHistoryID, nReplaceObjectInstanceID);
        }

        await FormIt.UndoManagement.EndState("Group Swapper plugin");

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
    document.getElementById(copyObjectGroupNameID).innerHTML = groupNamePrefixText + copyObjectData.groupName /* + ' (ID: ' + copyObjectData.nGroupHistoryID + ')'*/;
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
    document.getElementById(copyObjectGroupNameID).innerHTML = objectIDSelectingText;
    document.getElementById(copyObjectInstanceCountID).innerHTML = '';
}

GroupSwapper.setCopyObjectToUnsetState = function()
{
    document.getElementById(copyObjectGroupNameID).innerHTML = notSetText;
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
    document.getElementById(replaceObjectGroupNameID).innerHTML = groupNamePrefixText + replaceObjectData.groupName /*+ ' (ID: ' + replaceObjectData.nGroupHistoryID + ')'*/;
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
    document.getElementById(replaceObjectGroupNameID).innerHTML = objectIDSelectingText;
    document.getElementById(replaceObjectInstanceCountID).innerHTML = '';
}

GroupSwapper.setReplaceObjectToUnsetState = function()
{
    document.getElementById(replaceObjectGroupNameID).innerHTML = notSetText;
    document.getElementById(replaceObjectInstanceCountID).innerHTML = '';

    bIsReplaceObjectAvailable = false;
}

/*** update mechanisms for the comparison section ***/

GroupSwapper.updateUIForComparisonCheck = async function()
{
    // if both the copy object and replace object are available
    if (bIsCopyObjectAvailable && bIsReplaceObjectAvailable)
    {
        // the copy and replace object history IDs must be different to proceed
        if (nCopyObjectHistoryID != nReplaceObjectHistoryID)
        {
            document.getElementById(missingSelectionsDivID).className = 'hide';
            document.getElementById(incompatibleSelectionDivID).className = 'hide';
            document.getElementById(reviewAndApplyDivID).className = 'body';
            document.getElementById(identicalInputsDivID).className = 'hide';

            // before we proceed, delete all children of the review and apply details div
            document.getElementById(reviewAndApplyDetailsDivID).innerHTML = ("");

            let operationAffectsDiv = document.createElement('div');
            operationAffectsDiv.className = 'codeSnippet';
            operationAffectsDiv.style.fontStyle = 'normal';
            operationAffectsDiv.innerHTML = copyObjectName /*+ '(' + nCopyObjectHistoryID + ')'*/ + ' \u279e ' + replaceObjectName /*+ '(' + nReplaceObjectHistoryID + ')'*/;
            document.getElementById(reviewAndApplyDetailsDivID).appendChild(operationAffectsDiv)

            // line break
            document.getElementById(reviewAndApplyDetailsDivID).appendChild(document.createElement('br'));

            let affectStatement = document.createElement('div');
            if (nReplaceObjectInstanceCount > 1)
            {
                affectStatement.innerHTML = 'This operation will affect ' + nReplaceObjectInstanceCount + ' instances in the model.';
            }
            else 
            {
                affectStatement.innerHTML = 'This operation will affect ' + nReplaceObjectInstanceCount + ' instance in the model.';
            }

            document.getElementById(reviewAndApplyDetailsDivID).appendChild(affectStatement);

            // line break
            document.getElementById(reviewAndApplyDetailsDivID).appendChild(document.createElement('br'));
        }
        // otherwise, the history IDs are identical, so let the user know that we can't proceed
        else
        {
            document.getElementById(missingSelectionsDivID).className = 'hide';
            document.getElementById(incompatibleSelectionDivID).className = 'body';
            document.getElementById(reviewAndApplyDivID).className = 'hide';
            document.getElementById(identicalInputsDivID).className = 'hide';
        }
    }
    // missing one or both objects
    else
    {
        document.getElementById(missingSelectionsDivID).className = 'body';
        document.getElementById(incompatibleSelectionDivID).className = 'hide';
        document.getElementById(reviewAndApplyDivID).className = 'hide';
        document.getElementById(identicalInputsDivID).className = 'hide';
    }

}

/*** application code - runs asynchronously from plugin process to communicate with FormIt ***/

let nCurrentHistoryID;
let nHistoryDepth;

// flags for whether both selections are available and valid
let bIsCopyObjectAvailable;
let bIsReplaceObjectAvailable;

// globals to store pertinent data to display after both selections are completed
let nCopyObjectInstanceID;
let nCopyObjectGroupID;
let nCopyObjectHistoryID;
let copyObjectName;
let nCopyObjectInstanceCount;
let aCopyObjectInstances;

let nReplaceObjectHistoryID;
let replaceObjectName
let nReplaceObjectInstanceCount;
let aReplaceObjectInstances;

GroupSwapper.getSelectedInstanceData = async function()
{
    // get current history
    nCurrentHistoryID = await FormIt.GroupEdit.GetEditingHistoryID();

    // get current selection
    let aCurrentSelection = await FormIt.Selection.GetSelections();

    // only one object should be selected
    if (aCurrentSelection.length == 1)
    {
        // if you're not in the Main History, calculate the depth to extract the correct history data
        nHistoryDepth = (aCurrentSelection[0]["ids"].length) - 1;

        // get objectID of the current selection
        let nObjectID = aCurrentSelection[0]["ids"][nHistoryDepth]["Object"];

        // get object type of the current selection
        let nType = await WSM.APIGetObjectTypeReadOnly(nCurrentHistoryID, nObjectID);

        // get group instance info, if there are any selected, and push the results into arrays
        if (nType == WSM.nObjectType.nInstanceType)
        {
            // get the Group family ID
            let aGroupIDs = await WSM.APIGetObjectsByTypeReadOnly(nCurrentHistoryID, nObjectID, WSM.nObjectType.nGroupType, true);
            let nGroupID = aGroupIDs[0];

            // get the Group family History ID
            let nGroupHistoryID = await WSM.APIGetGroupReferencedHistoryReadOnly(nCurrentHistoryID, nGroupID);

            // get the Group family name
            //let groupName = PropertiesPlus.getGroupFamilyName(nGroupHistoryID);
            let groupName = await PropertiesPlus.getGroupFamilyName(nGroupHistoryID);

            let nGroupReferenceHistoryID = await WSM.APIGetGroupReferencedHistoryReadOnly(nCurrentHistoryID, nGroupID);
            //console.log("Reference history for this Group: " + referenceHistoryID);
    
            // determine how many total instances of this Group are in the model
            let aIdenticalGroupInstances = await WSM.APIGetAllAggregateTransf3dsReadOnly(nGroupReferenceHistoryID, 0);
            let nIdenticalInstanceCount = aIdenticalGroupInstances.paths.length;
            console.log("Number of instances in model: " + nIdenticalInstanceCount);

            // return an object with the instance data
            return {
                "nInstanceID" : nObjectID,
                "nGroupID": nGroupID, 
                "nGroupHistoryID" : nGroupHistoryID,
                "nGroupReferenceHistoryID" : nGroupReferenceHistoryID,
                "groupName" : groupName,
                "nIdenticalInstanceCount" : nIdenticalInstanceCount,
                "aIdenticalGroupInstances" : aIdenticalGroupInstances
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
        copyObjectName = selectedInstanceProperties.groupName;
        nCopyObjectInstanceID = selectedInstanceProperties.nInstanceID;
        nCopyObjectGroupID = selectedInstanceProperties.nGroupID;
        nCopyObjectHistoryID = selectedInstanceProperties.nGroupHistoryID;
        nCopyObjectInstanceCount = selectedInstanceProperties.nIdenticalInstanceCount;
        aCopyObjectInstances = selectedInstanceProperties.aIdenticalGroupInstances;
        
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
        replaceObjectName = selectedInstanceProperties.groupName;
        nReplaceObjectHistoryID = selectedInstanceProperties.nGroupHistoryID;
        nReplaceObjectInstanceCount = selectedInstanceProperties.nIdenticalInstanceCount;
        aReplaceObjectInstances = selectedInstanceProperties.aIdenticalGroupInstances;

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
}