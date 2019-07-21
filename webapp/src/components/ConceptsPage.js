import {Card} from '@material-ui/core';
import Button from '@material-ui/core/Button';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import CancelIcon from '@material-ui/icons/Cancel';
import React from 'react';
import withStyles from '@material-ui/core/styles/withStyles';
import {withRouter} from 'react-router-dom';
import {ExpansionStore} from '../contexts/ExpansionContext.js';
import {withRfcContext} from '../contexts/RfcContext';
import Typography from '@material-ui/core/Typography';
import {ShapeEditorStore, withShapeEditorContext} from '../contexts/ShapeEditorContext.js';
import {ShapesCommands} from '../engine';
import {routerUrls} from '../routes.js';
import ContributionWrapper from './contributions/ContributionWrapper.js';
import {FullSheet} from './navigation/Editor.js';
import {EditorModes, withEditorContext} from '../contexts/EditorContext';
import ContributionTextField from './contributions/ContributionTextField';
import {updateContribution} from '../engine/routines';
import Editor from './navigation/Editor';
import {track} from '../Analytics';
import Helmet from 'react-helmet';
import RequestPageHeader from './requests/RequestPageHeader.js';
import BasicButton from './shape-editor/BasicButton.js';
import {ShapeParameterName} from './shape-editor/NameInputs.js';
import {coreShapeIdsSet} from './shape-editor/ShapeUtilities.js';
import ShapeViewer, {WriteOnly} from './shape-editor/ShapeViewer.js';

export const styles = theme => ({
    root: {
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 15
    },
    shapeEditorContainer: {
        padding: 10,
        borderRadius: 5,
        backgroundColor: '#f8f8f8'
    }
});

class ConceptsPage extends React.Component {
    renderMissing() {
        const {classes} = this.props
        return (
            <Editor>
                <FullSheet>
                    <div className={classes.root}>
                        <Typography>This Concept does not exist</Typography>
                    </div>
                </FullSheet>
            </Editor>
        )
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.conceptId !== this.props.conceptId) {
            track('Loaded Concept')
        }
    }


    render() {
        const {history, baseUrl, classes, conceptId, handleCommand, mode, cachedQueryResults, queries, apiName} = this.props;
        const {contributions} = cachedQueryResults;

        let shape = null;
        try {
            shape = queries.shapeById(conceptId);
        } catch (e) {
            console.error(e)
            return this.renderMissing()
        }

        return (
            <Editor>
                <Helmet><title>{shape.name} -- {apiName}</title></Helmet>
                <FullSheet>
                    <div className={classes.root}>
                        <ContributionTextField
                            key={`${conceptId}-name`}
                            value={shape.name}
                            variant={'heading'}
                            placeholder={'Concept Name'}
                            mode={mode}
                            onBlur={(value) => {
                                const command = ShapesCommands.RenameShape(conceptId, value)
                                handleCommand(command)
                            }}
                        />

                        <ContributionTextField
                            key={`${conceptId}-description`}
                            value={contributions.getOrUndefined(conceptId, 'description')}
                            variant={'multi'}
                            placeholder={'Description'}
                            mode={mode}
                            onBlur={(value) => {
                                handleCommand(updateContribution(conceptId, 'description', value));
                            }}
                        />
                        <ShapeEditorStore onShapeSelected={(shapeId) => {
                            history.push(routerUrls.conceptPage(baseUrl, shapeId))
                        }}>
                            <ExpansionStore>
                                <ShapeParameterManagerWrapper mode={mode} shape={shape}/>
                                <div className={classes.shapeEditorContainer}>
                                    <ShapeViewer shape={shape}/>
                                </div>
                            </ExpansionStore>
                        </ShapeEditorStore>
                    </div>
                </FullSheet>
            </Editor>
        );
    }
}

function ShapeParameterManagerBase({parameters, cachedQueryResults, shape, canManage, addParameter, removeShapeParameter}) {
    const [shouldShowControls, setShouldShowControls] = React.useState(parameters.length > 0)
    const parameterComponents = parameters
        .map(parameter => {
            return (
                <div style={{display: 'flex', alignItems: 'center'}}>
                    <ShapeParameterName name={parameter.name} shapeParameterId={parameter.shapeParameterId}/>
                    <ContributionWrapper
                        value={parameter.name}
                        defaultText={''}
                        variant="inline"
                        cachedQueryResults={cachedQueryResults}
                        contributionKey="description"
                        contributionParentId={parameter.shapeParameterId}
                    />
                    {canManage && <WriteOnly>
                        <BasicButton onClick={() => removeShapeParameter(parameter.shapeParameterId)}>
                            <CancelIcon style={{width: 15, color: '#a6a6a6'}}/>
                        </BasicButton>
                    </WriteOnly>}
                </div>
            )
        })

    if (!shouldShowControls) {
        return (
            <div style={{padding: '2em'}}>
                <WriteOnly>
                    <Card>
                        <CardHeader title={"Composable Shapes"} />
                        <CardContent>
                            <Typography variant="body1">
                                Composable Shapes have Parameters so you can reuse them more easily.
                                For example, you might use pagination in your API and want to ensure that all endpoints
                                follow a consistent Shape.
                                However, each one will have a different Shape for the items returned in the list.
                                Instead of replicating the same wrapper fields across all of these endpoints, add a
                                Parameter and in each context pass in a different Shape for the items.
                                Add a Concept called PaginatedList. Add a field called "items" and make it a List.
                                You'll see that the List expects a Parameter T. We want to fill this T with a Parameter
                                from PaginatedList so we should add one called Item.
                                Now we can choose the Parameter "Items" and set "T". Now when we have an endpoint that
                                returns a list of Pets, we can set that shape to be PaginatedList and pass in Pet for
                                the "Items" Parameter
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button color="secondary" onClick={() => setShouldShowControls(true)}>make this Shape
                                composable</Button>
                        </CardActions>
                    </Card>
                </WriteOnly>
            </div>
        )
    }
    return (
        <div>
            <RequestPageHeader forType={'Parameter'} canAdd={canManage} addAction={() => addParameter(shape.shapeId)}/>
            {parameterComponents.length === 0 ? <Typography>No Parameters</Typography> : parameterComponents}
            <br/>
        </div>
    )
}

const ShapeParameterManager = withEditorContext(withShapeEditorContext(ShapeParameterManagerBase))

function ShapeParameterManagerWrapper({mode, shape}) {
    const parameters = shape.parameters.filter(parameter => !parameter.isRemoved)

    if (mode === EditorModes.DOCUMENTATION && parameters.length === 0) {
        return null
    }
    const canManage = !coreShapeIdsSet.has(shape.shapeId)

    return (
        <div>
            <ShapeParameterManager shape={shape} parameters={parameters} canManage={canManage}/>
        </div>
    )
}

export default withRouter(withEditorContext(withRfcContext(withStyles(styles)(ConceptsPage))));
