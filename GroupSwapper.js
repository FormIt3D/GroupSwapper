if (typeof GroupSwapper == 'undefined')
{
    GroupSwapper = {};
}

/*** web/UI code - runs natively in the plugin process ***/

// flag to indicate a selection is in progress
GroupSwapper.bIsSelectionForCopyInProgress = false;
GroupSwapper.bIsSelectionForReplaceInProgress = false;

// IDs input elements that need to be referenced or updated
// copy object section
GroupSwapper.copyObjectGroupNameID = 'copyObjectGroupName';
GroupSwapper.copyObjectInstanceCountID = 'bopyObjectInstanceCount';
// replace object section
GroupSwapper.replaceObjectGroupNameID = 'replaceObjectGroupName';
GroupSwapper.replaceObjectInstanceCountID = 'replaceObjectInstanceCount';
// review and apply section
GroupSwapper.missingSelectionsDivID = 'noSelectionsDiv';
GroupSwapper.identicalGroupInstancesDivID = 'identicalGroupInstancesDiv';
GroupSwapper.differentContextHistoriesDivID = 'differentContextHistoriesDiv';
GroupSwapper.reviewAndApplyDivID = 'reviewAndApplySection';
GroupSwapper.reviewAndApplyDetailsDivID = 'reviewAndApplyDetails';

GroupSwapper.selectionMessagePrefixText = 'Select a Group instance ';
GroupSwapper.historyIDPrefixText = 'ID: ';
GroupSwapper.groupNamePrefixText = '';
GroupSwapper.identicalInstancePrefixText = 'Instances in model: ';
GroupSwapper.objectIDSelectingText = 'Selecting...';
GroupSwapper.notSetText = '(not set)';

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

    // create the message about changes being limited to the editing context only
    let editingContextOnlyMessage = document.createElement('div');
    editingContextOnlyMessage.innerHTML = 'Replacements will only occur in the current editing context.';
    contentContainer.appendChild(editingContextOnlyMessage);
    

    /* group to copy */

    // create the object to match subheader
    let groupToCopySubheader = contentContainer.appendChild(document.createElement('p'));
    groupToCopySubheader.style = 'font-weight: bold;'
    groupToCopySubheader.innerHTML = 'Group to Copy';

    // the name of the object to copy
    let groupToCopyNameDiv = document.createElement('div');
    groupToCopyNameDiv.innerHTML = GroupSwapper.notSetText;
    groupToCopyNameDiv.id = GroupSwapper.copyObjectGroupNameID;
    contentContainer.appendChild(groupToCopyNameDiv);

    // the group instance count
    let groupToCopyCountDiv = document.createElement('div');
    groupToCopyCountDiv.innerHTML = '';
    groupToCopyCountDiv.id = GroupSwapper.copyObjectInstanceCountID;
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
    groupToReplaceNameDiv.innerHTML = GroupSwapper.notSetText;
    groupToReplaceNameDiv.id = GroupSwapper.replaceObjectGroupNameID;
    contentContainer.appendChild(groupToReplaceNameDiv);

    // the group instance count
    let groupToReplaceCountDiv = document.createElement('div');
    groupToReplaceCountDiv.innerHTML = '';
    groupToReplaceCountDiv.id = GroupSwapper.replaceObjectInstanceCountID;
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
    missingSelectionsDiv.id = GroupSwapper.missingSelectionsDivID;
    contentContainer.appendChild(missingSelectionsDiv);

    // when the selections are fulfilled, but incompatible
    let incompatibleSelectionsDiv = contentContainer.appendChild(document.createElement('p'));
    incompatibleSelectionsDiv.innerHTML = 'These Groups are identical. Select an instance from a different Group for each of the two buttons above.';
    incompatibleSelectionsDiv.id = GroupSwapper.identicalGroupInstancesDivID;
    contentContainer.appendChild(incompatibleSelectionsDiv);

    // when the selections are fulfilled, compatible, but identical
    let differentContextHistoriesDiv = contentContainer.appendChild(document.createElement('p'));
    differentContextHistoriesDiv.innerHTML = 'The selected Group instances need to be in the same editing context to continue.';
    differentContextHistoriesDiv.id = GroupSwapper.differentContextHistoriesDivID;
    contentContainer.appendChild(differentContextHistoriesDiv);

    // create the affected inputs container
    // will be hidden until both selections are valid
    let reviewAndApplyDiv = contentContainer.appendChild(document.createElement('div'));
    reviewAndApplyDiv.id = GroupSwapper.reviewAndApplyDivID;

    let reviewAndApplyDetailsDiv = reviewAndApplyDiv.appendChild(document.createElement('div'));
    reviewAndApplyDetailsDiv.id = GroupSwapper.reviewAndApplyDetailsDivID;

    // create the button to apply the changes
    reviewAndApplyDiv.appendChild(new FormIt.PluginUI.Button('Apply Changes', async function()
    {

        await GroupSwapper.swapAllInstancesWithSelectedInstance();

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
    document.getElementById(GroupSwapper.copyObjectGroupNameID).innerHTML = GroupSwapper.groupNamePrefixText + copyObjectData.groupName /* + ' (ID: ' + copyObjectData.nGroupHistoryID + ')'*/;
    document.getElementById(GroupSwapper.copyObjectInstanceCountID).innerHTML = GroupSwapper.identicalInstancePrefixText + copyObjectData.nIdenticalInstanceCount;

    GroupSwapper.bIsCopyObjectAvailable = true;

    if (GroupSwapper.bIsCopyObjectAvailable && GroupSwapper.bIsReplaceObjectAvailable)
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
    document.getElementById(GroupSwapper.copyObjectGroupNameID).innerHTML = GroupSwapper.objectIDSelectingText;
    document.getElementById(GroupSwapper.copyObjectInstanceCountID).innerHTML = '';
}

GroupSwapper.setCopyObjectToUnsetState = function()
{
    document.getElementById(GroupSwapper.copyObjectGroupNameID).innerHTML = GroupSwapper.notSetText;
    document.getElementById(GroupSwapper.copyObjectInstanceCountID).innerHTML = '';

    GroupSwapper.bIsCopyObjectAvailable = false;
}

/*** update mechanisms for the replacement object section ***/

GroupSwapper.updateUIForReplaceObject = async function()
{
    GroupSwapper.tryGetGroupToReplace();
}

GroupSwapper.setReplaceObjectToActiveState = async function(replaceObjectData)
{
    document.getElementById(GroupSwapper.replaceObjectGroupNameID).innerHTML = GroupSwapper.groupNamePrefixText + replaceObjectData.groupName /*+ ' (ID: ' + replaceObjectData.nGroupHistoryID + ')'*/;
    document.getElementById(GroupSwapper.replaceObjectInstanceCountID).innerHTML = GroupSwapper.identicalInstancePrefixText + replaceObjectData.nIdenticalInstanceCount;

    GroupSwapper.bIsReplaceObjectAvailable = true;

    if (GroupSwapper.bIsCopyObjectAvailable && GroupSwapper.bIsReplaceObjectAvailable)
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
    document.getElementById(GroupSwapper.replaceObjectGroupNameID).innerHTML = GroupSwapper.objectIDSelectingText;
    document.getElementById(GroupSwapper.replaceObjectInstanceCountID).innerHTML = '';
}

GroupSwapper.setReplaceObjectToUnsetState = function()
{
    document.getElementById(GroupSwapper.replaceObjectGroupNameID).innerHTML = GroupSwapper.notSetText;
    document.getElementById(GroupSwapper.replaceObjectInstanceCountID).innerHTML = '';

    GroupSwapper.bIsReplaceObjectAvailable = false;
}

/*** update mechanisms for the comparison section ***/

GroupSwapper.updateUIForComparisonCheck = async function()
{
    // determine some bools

    // if both the copy object and replace object are available
    let bAreRequiredObjectsSelected = GroupSwapper.bIsCopyObjectAvailable && GroupSwapper.bIsReplaceObjectAvailable;   
    // if the selected instances are from different groups
    let bAreSelectedInstancesUnique = GroupSwapper.nCopyObjectHistoryID != GroupSwapper.nReplaceObjectHistoryID;
    // if the selected instances are in the same editing context
    let bAreSelectedInstancesInSameContext = GroupSwapper.nCopyObjectContextHistoryID == GroupSwapper.nReplaceObjectContextHistoryID;

    if (bAreRequiredObjectsSelected)
    {
        // the copy and replace object history IDs must be different to proceed
        if (bAreSelectedInstancesUnique && bAreSelectedInstancesInSameContext)
        {
            document.getElementById(GroupSwapper.missingSelectionsDivID).className = 'hide';
            document.getElementById(GroupSwapper.identicalGroupInstancesDivID).className = 'hide';
            document.getElementById(GroupSwapper.reviewAndApplyDivID).className = 'body';
            document.getElementById(GroupSwapper.differentContextHistoriesDivID).className = 'hide';

            // before we proceed, delete all children of the review and apply details div
            document.getElementById(GroupSwapper.reviewAndApplyDetailsDivID).innerHTML = ("");

            let operationAffectsDiv = document.createElement('div');
            operationAffectsDiv.className = 'codeSnippet';
            operationAffectsDiv.style.fontStyle = 'normal';
            operationAffectsDiv.innerHTML = GroupSwapper.copyObjectName /*+ '(' + GroupSwapper.nCopyObjectHistoryID + ')'*/ + ' \u279e ' + GroupSwapper.replaceObjectName /*+ '(' + GroupSwapper.nReplaceObjectHistoryID + ')'*/;
            document.getElementById(GroupSwapper.reviewAndApplyDetailsDivID).appendChild(operationAffectsDiv)

            // line break
            document.getElementById(GroupSwapper.reviewAndApplyDetailsDivID).appendChild(document.createElement('br'));

            let affectStatement = document.createElement('div');
            if (GroupSwapper.nReplaceObjectInstanceCount > 1)
            {
                affectStatement.innerHTML = 'This operation will affect ' + GroupSwapper.nReplaceObjectInstanceCount + ' instances in the model.';
            }
            else 
            {
                affectStatement.innerHTML = 'This operation will affect ' + GroupSwapper.nReplaceObjectInstanceCount + ' instance in the model.';
            }

            document.getElementById(GroupSwapper.reviewAndApplyDetailsDivID).appendChild(affectStatement);

            // line break
            document.getElementById(GroupSwapper.reviewAndApplyDetailsDivID).appendChild(document.createElement('br'));
        }
        // can't proceed: the history IDs of the selected instances are identical
        else if (!bAreSelectedInstancesUnique && bAreSelectedInstancesInSameContext)
        {
            document.getElementById(GroupSwapper.missingSelectionsDivID).className = 'hide';
            document.getElementById(GroupSwapper.identicalGroupInstancesDivID).className = 'body';
            document.getElementById(GroupSwapper.reviewAndApplyDivID).className = 'hide';
            document.getElementById(GroupSwapper.differentContextHistoriesDivID).className = 'hide';
        }
        // can't proceed: the instances are in different contexts
        else if (bAreSelectedInstancesUnique && !bAreSelectedInstancesInSameContext)
        {
            document.getElementById(GroupSwapper.missingSelectionsDivID).className = 'hide';
            document.getElementById(GroupSwapper.identicalGroupInstancesDivID).className = 'hide';
            document.getElementById(GroupSwapper.reviewAndApplyDivID).className = 'hide';
            document.getElementById(GroupSwapper.differentContextHistoriesDivID).className = 'body';
        }
    }
    // missing one or both objects
    else
    {
        document.getElementById(GroupSwapper.missingSelectionsDivID).className = 'body';
        document.getElementById(GroupSwapper.identicalGroupInstancesDivID).className = 'hide';
        document.getElementById(GroupSwapper.reviewAndApplyDivID).className = 'hide';
        document.getElementById(GroupSwapper.differentContextHistoriesDivID).className = 'hide';
    }

}

/*** application code - runs asynchronously from plugin process to communicate with FormIt ***/

GroupSwapper.nHistoryID = undefined;
GroupSwapper.nHistoryDepth = undefined;

// flags for whether both selections are available and valid
GroupSwapper.bIsCopyObjectAvailable = undefined;
GroupSwapper.bIsReplaceObjectAvailable = undefined;

// globals to store pertinent data to display after both selections are completed
GroupSwapper.nCopyObjectInstanceID = undefined;
GroupSwapper.nCopyObjectGroupID = undefined;
GroupSwapper.nCopyObjectHistoryID = undefined;
GroupSwapper.nCopyObjectContextHistoryID = undefined;
GroupSwapper.copyObjectName = undefined;
GroupSwapper.nCopyObjectInstanceCount = undefined;
GroupSwapper.aCopyObjectInstancePaths = undefined;

GroupSwapper.nReplaceObjectHistoryID = undefined;
GroupSwapper.nReplaceObjectContextHistoryID = undefined;
GroupSwapper.replaceObjectName = undefined;
GroupSwapper.nReplaceObjectInstanceCount = undefined;
GroupSwapper.aReplaceObjectInstancePaths = undefined;

GroupSwapper.getSelectedInstanceData = async function()
{
    // get current history
    GroupSwapper.nHistoryID = await FormIt.GroupEdit.GetEditingHistoryID();

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
        let nType = await WSM.APIGetObjectTypeReadOnly(GroupSwapper.nHistoryID, nObjectID);

        // get group instance info, if there are any selected, and push the results into arrays
        if (nType == WSM.nObjectType.nInstanceType)
        {
            // get the Group family ID
            let aGroupIDs = await WSM.APIGetObjectsByTypeReadOnly(GroupSwapper.nHistoryID, nObjectID, WSM.nObjectType.nGroupType, true);
            let nGroupID = aGroupIDs[0];

            // get the Group family History ID
            let nGroupHistoryID = await WSM.APIGetGroupReferencedHistoryReadOnly(GroupSwapper.nHistoryID, nGroupID);

            // get the Group family name
            let groupName = await PropertiesPlus.getGroupFamilyName(nGroupHistoryID);

            let nGroupReferenceHistoryID = await WSM.APIGetGroupReferencedHistoryReadOnly(GroupSwapper.nHistoryID, nGroupID);
            //console.log("Reference history for this Group: " + referenceHistoryID);
    
            // determine how many total instances of this Group are in the model
            let aIdenticalGroupInstances = await WSM.APIGetAllAggregateTransf3dsReadOnly(nGroupReferenceHistoryID, 0);
            let nIdenticalInstanceCount = aIdenticalGroupInstances.paths.length;
            //console.log("Number of instances in model: " + nIdenticalInstanceCount);
            //console.log("aIdenticalGroupInstances: " + JSON.stringify(aIdenticalGroupInstances));

            // currently, this plugin only works on instances in the current context
            // so post-process the identical instances to include only those in the same editing history
            let aIdenticalGroupInstancesInContext = JSON.parse(JSON.stringify(aIdenticalGroupInstances)); // start with the original object
            let nIdenticalGroupInstancesInContextCount = nIdenticalInstanceCount; // start with the original count

            for (var i = 0; i < nIdenticalInstanceCount; i++)
            {
                let instanceData = await WSM.GroupInstancePath.GetFinalObjectHistoryID(aIdenticalGroupInstances["paths"][i]);
                let nInstanceContextHistoryID = instanceData["History"];

                // if the editing history ID does not match the selected instance context history ID, remove it from the GroupInstancePath object
                if (nInstanceContextHistoryID != GroupSwapper.nHistoryID)
                {
                    aIdenticalGroupInstancesInContext["paths"].splice(i, 1);
                    aIdenticalGroupInstancesInContext["transforms"].splice(i, 1);
                    nIdenticalGroupInstancesInContextCount--;
                }
            }

            // return an object with the instance data
            return {
                "nInstanceID" : nObjectID,
                "nInstanceContextHistoryID" : GroupSwapper.nHistoryID,
                "nGroupID": nGroupID, 
                "nGroupHistoryID" : nGroupHistoryID,
                "nGroupReferenceHistoryID" : nGroupReferenceHistoryID,
                "groupName" : groupName,
                "aIdenticalGroupInstances" : aIdenticalGroupInstances,
                "nIdenticalInstanceCount" : nIdenticalInstanceCount,
                "aIdenticalGroupInstancesInContext" : aIdenticalGroupInstancesInContext,
                "nIdenticalGroupInstancesInContextCount" : nIdenticalGroupInstancesInContextCount
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
        GroupSwapper.copyObjectName = selectedInstanceProperties.groupName;
        GroupSwapper.nCopyObjectInstanceID = selectedInstanceProperties.nInstanceID;
        GroupSwapper.nCopyObjectGroupID = selectedInstanceProperties.nGroupID;
        GroupSwapper.nCopyObjectHistoryID = selectedInstanceProperties.nGroupHistoryID;
        GroupSwapper.nCopyObjectContextHistoryID = selectedInstanceProperties.nInstanceContextHistoryID;
        GroupSwapper.nCopyObjectInstanceCount = selectedInstanceProperties.nIdenticalGroupInstancesInContextCount;
        GroupSwapper.aCopyObjectInstancePaths = selectedInstanceProperties.aIdenticalGroupInstancesInContext;
        
        await GroupSwapper.setCopyObjectToActiveState(selectedInstanceProperties);
    }
    // if the selection isn't valid, put the user in select mode
    else
    {
        await FormIt.Selection.ClearSelections();

        let message = GroupSwapper.selectionMessagePrefixText + "to copy.";
        await FormIt.UI.ShowNotification(message, FormIt.NotificationType.Information, 0);
        console.log("\n" + message);

        GroupSwapper.bIsCopyObjectAvailable = false;
        GroupSwapper.bIsSelectionForCopyInProgress = true;

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
        GroupSwapper.replaceObjectName = selectedInstanceProperties.groupName;
        GroupSwapper.nReplaceObjectHistoryID = selectedInstanceProperties.nGroupHistoryID;
        GroupSwapper.nReplaceObjectContextHistoryID = selectedInstanceProperties.nInstanceContextHistoryID;
        GroupSwapper.nReplaceObjectInstanceCount = selectedInstanceProperties.nIdenticalGroupInstancesInContextCount;
        GroupSwapper.aReplaceObjectInstancePaths = selectedInstanceProperties.aIdenticalGroupInstancesInContext;

        await GroupSwapper.setReplaceObjectToActiveState(selectedInstanceProperties);
    }
    // if the selection isn't valid, put the user in select mode
    else
    {
        await FormIt.Selection.ClearSelections();

        let message = GroupSwapper.selectionMessagePrefixText + "to replace.";
        await FormIt.UI.ShowNotification(message, FormIt.NotificationType.Information, 0);
        console.log("\n" + message);

        GroupSwapper.bIsReplaceObjectAvailable = false;
        GroupSwapper.bIsSelectionForReplaceInProgress = true;

        GroupSwapper.setReplaceObjectToSelectingState();
        await GroupSwapper.updateUIForComparisonCheck();
    }
}

// the actual group swap mechanism
GroupSwapper.swapAllInstancesWithSelectedInstance = async function()
{
    await FormIt.UndoManagement.BeginState();

    // keep track of all instances that have already been swapped
    // this will prevent over-swapping in case the editing context history has multiple instances in the model
    let aCompletedInstanceIDs = [];

    // get information about the copy instance only once
    let nCopyObjectInstanceData = await WSM.GroupInstancePath.GetFinalObjectHistoryID(GroupSwapper.aCopyObjectInstancePaths["paths"][0]);
    let nCopyObjectContextHistoryID = nCopyObjectInstanceData["History"];

    // for each of the instances to be replaced, copy the selected instance to that location, then delete the original
    for (var i = 0; i < GroupSwapper.nReplaceObjectInstanceCount; i++)
    {
        let replaceObjectInstanceData = await WSM.GroupInstancePath.GetFinalObjectHistoryID(GroupSwapper.aReplaceObjectInstancePaths["paths"][i]);
        let nReplaceObjectInstanceID = replaceObjectInstanceData["Object"];
        let nReplaceObjectContextHistoryID = replaceObjectInstanceData["History"];
        let replaceObjectInstanceTransform = await WSM.APIGetInstanceTransf3dReadOnly(nReplaceObjectContextHistoryID, nReplaceObjectInstanceID);
        //await FormIt.ConsoleLog(JSON.stringify(GroupSwapper.aReplaceObjectInstancePaths));

        // don't proceed if this instance has already been swapped
        let bHasBeenConverted = aCompletedInstanceIDs.indexOf(nReplaceObjectInstanceID) != -1;
        if (bHasBeenConverted)
        {
            continue;
        }
        else
        {
            aCompletedInstanceIDs.push(nReplaceObjectInstanceID);
        }

        // if the copy object and replace object are in the same history, proceed
        if (nCopyObjectContextHistoryID == nReplaceObjectContextHistoryID)
        {
            // create new instances of the copy object, transformed to match the replacement object
            await WSM.APIAddInstancesToGroup(nReplaceObjectContextHistoryID, GroupSwapper.nCopyObjectGroupID, replaceObjectInstanceTransform);

            // delete the instance that has now been replaced
            await WSM.APIDeleteObject(nReplaceObjectContextHistoryID, nReplaceObjectInstanceID);
        }
        // otherwise, need to use a different API that supports cross-history operations
        else 
        {
            // TODO: figure out how to get this to work

            //await WSM.APICopyOrSketchAndTransformObjects(nCopyObjectContextHistoryID, nReplaceObjectContextHistoryID, GroupSwapper.nCopyObjectInstanceID, replaceObjectInstanceTransform, 1, false);
        }
    }

    await FormIt.UndoManagement.EndState("Group Swapper plugin");
}