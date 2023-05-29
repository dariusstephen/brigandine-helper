import React, { useState, useEffect, Fragment } from 'react';
import { connect } from 'react-redux';
import _, { isEmpty } from 'lodash';
import { 
  Button, Container, Card, CardHeader, CardBody, Table,
  Row, Col, Form, Input, FormGroup, Label,
} from 'reactstrap';
import { Typeahead } from 'react-bootstrap-typeahead';

import classes from '../../data/classes';
import rewardTypes from '../../data/item-types';
import locations from '../../data/locations';
import cities from '../../data/cities';
import factions from '../../data/factions';
import itemCategories from '../../data/item-categories';

const classArr = _.sortBy(Object.values(classes), 'name');
const locationArr = Object.values(locations);
const cityArr = Object.values(cities);
const factionsArr = _.reject(Object.values(factions), f => f === factions.unaligned);
const rewardsByType = _.groupBy(rewardTypes, item => item.category.name);

const Questfinder = () => {
  const [selectedClass, setSelectedClass] = useState([]);
  const [selectedRewards, setSelectedRewards] = useState([]);
  const [selectedCities, setSelectedCities] = useState([...cityArr]);
  const [queryResults, setQueryResults] = useState([]);
  const [rewardQueryResults, setRewardQueryResults] = useState([]);
  const [showRewardsColumn, setShowRewardsColumn] = useState(false);
  const [topLocationScore, setTopLocationScore] = useState(0);

  const factionSelectAll = (e, f, shouldAdd) => {
    setSelectedCities((shouldAdd) ? _.uniq([...f.starterCities, ...selectedCities]) : _.reject(selectedCities, c => f.starterCities.includes(c)));
    e.preventDefault();
  };

  const cityToggle = c => setSelectedCities(selectedCities.includes(c) ? _.without(selectedCities, c) : [...selectedCities, c]);

  const rewardToggle = r => setSelectedRewards(selectedRewards.includes(r) ? _.without(selectedRewards, r) : [...selectedRewards, r]);

  const classQuery = () => selectedClass.map((c) => {
    const bonusLocations = locationArr.filter(l => c.questBonus.includes(l.type));
    const cityScores = _.reduce(selectedCities, (m, city) => {
      const score = _.intersection(bonusLocations, city.locations).length;
      if (score > 0) return [...m, { name: city.name, score }];
      return m;
    }, []);
    return {
      name: c.name,
      scores: _.sortBy(cityScores, city => city.score * -1),
    };
  });

  const rewardsQuery = () => {
    const locationScores = _(locationArr).map(l => ({
      location: l,
      rewards: _.intersection(selectedRewards, l.rewards),
      score: _.intersection(selectedRewards, l.rewards).length,
    })).filter(ls => ls.score > 0).value();
    const results = _.reduce(selectedCities, (m, city) => {
      const cityLocations = _.filter(locationScores, ls => city.locations.includes(ls.location));
      const totalScore = _.sumBy(cityLocations, 'score');
      return [...m, ...(cityLocations.map(cl => ({ ...cl, city: city.name, totalScore })))];
    }, []);
    const max = (_.maxBy(results, 'score'));
    setTopLocationScore(max ? max.score : 0);
    return _.orderBy(results, ['totalScore', 'city', 'score'], 'desc');
  };

  const fullQuery = () => selectedClass.map((c) => {
    const bonusLocations = locationArr.filter(l => c.questBonus.includes(l.type));
    const cityScores = _.reduce(selectedCities, (m, city) => {
      const cityBonusLocations = _.intersection(bonusLocations, city.locations);
      const rewards = _(cityBonusLocations)
        .map(cbl => _.intersection(cbl.rewards, selectedRewards))
        .flatten()
        .uniq()
        .value();
      if (rewards.length > 0) return [...m, { name: city.name, score: rewards.length, rewards }];
      return m;
    }, []);
    return {
      name: c.name,
      scores: _.sortBy(cityScores, city => city.score * -1),
    };
  });

  useEffect(() => {
    if (!selectedClass) return;
    let results = [];
    let rqResults = [];
    setShowRewardsColumn(false);
    if (!_.isEmpty(selectedClass) && _.isEmpty(selectedRewards)) {
      results = classQuery();
    } else if (isEmpty(selectedClass) && !_.isEmpty(selectedRewards)) {
      rqResults = rewardsQuery();
    } else if (!isEmpty(selectedClass) && !_.isEmpty(selectedRewards)) {
      setShowRewardsColumn(true);
      results = fullQuery();
    }
    setRewardQueryResults(rqResults);
    setQueryResults(results);
  }, [selectedClass, selectedRewards, selectedCities]);
  return (
    <Container fluid className="mt-3 pl-3 pr-3">
      <h3 className="text-center">Quest Location Finder</h3>
      <Row>
        {factionsArr.map(f => (
          <Col key={f.name} sm={4} className="mb-2">
            <Card>
              <CardHeader>
                <img src={f.flag} height="32" alt="Flag" />
                {` ${f.name}  `}
                <Button color="link" onClick={e => factionSelectAll(e, f, true)}>All</Button>
                {' | '}
                <Button color="link" onClick={e => factionSelectAll(e, f, false)}>None</Button>
              </CardHeader>
              <CardBody>
                <Form>
                  <Row>
                    {_.sortBy(f.starterCities, 'name').map(c => (
                      <Col key={c.name} sm={4}>
                        <FormGroup check>
                          <Input type="checkbox" onChange={event => cityToggle(c)} checked={selectedCities.includes(c)} /> 
                          <Label check onClick={() => cityToggle(c)}>{` ${c.name}`}</Label>
                        </FormGroup>
                      </Col>
                    ))}
                  </Row>
                </Form>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
      <hr />
      <Row>
        <Col sm={4}>
          <Row>
            <Col sm={12}>
              <h4>Selections</h4>
              <Typeahead
                id="class-typeahead"
                labelKey="name"
                multiple
                options={classArr}
                placeholder="Choose one or more classes..."
                onChange={setSelectedClass}
                className="mb-2"
              />
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              {_.orderBy(_.map(rewardsByType, (v, k) => (
                <Card key={k} className="mb-2">
                  <CardHeader>{ k }</CardHeader>
                  <div className="pb-1">
                    {v.map(itemType => (
                      <Button
                        className="mt-1 ml-1" 
                        key={itemType.name} 
                        color={selectedRewards.includes(itemType) ? 'primary' : 'secondary'} 
                        onClick={() => rewardToggle(itemType)}
                      >
                        <img src={itemType.img} alt={itemType.name} />
                      </Button>
                    ))}
                  </div>
                </Card>
              )), c => (_.find(itemCategories, ic => ic.name === c.key).order))}
            </Col>
          </Row>
        </Col>
        <Col sm={8}>
          <h4>Results</h4>
          <div>
            {_.isEmpty(queryResults) && _.isEmpty(rewardQueryResults) && 'No Results'}
            {(!_.isEmpty(queryResults) || !_.isEmpty(rewardQueryResults)) && (
              <div>
                <Table borderless className="bg-dark">
                  <thead>
                    {_.isEmpty(selectedClass) ? (
                      <tr>
                        <td>City</td>
                        <td>Location</td>
                        <td>Rewards</td>
                      </tr>
                    ) : (
                      <tr>
                        <td>Class</td>
                        <td>City</td>
                        <td>Score</td>
                        {showRewardsColumn && (<td>Rewards</td>)}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {_.isEmpty(selectedClass) && (
                    <Fragment>
                      {rewardQueryResults.map(qr => (
                        <tr key={`${qr.city}${qr.location.name}`} className={qr.score === topLocationScore ? 'table-primary' : ''}>
                          <td>{`(${qr.totalScore}) ${qr.city}`}</td>
                          <td>{`(${qr.score}) ${qr.location.name}`}</td>
                          <td>{qr.rewards.map(r => <img src={r.img} alt={r.name} />)}</td>
                        </tr>
                      ))}
                    </Fragment>
                    )}
                    {!_.isEmpty(selectedClass) && (
                      <Fragment>
                        {queryResults.map(qr => (
                          <Fragment key={qr.name}>
                            {_.isEmpty(qr.scores) && (
                            <tr>
                              <td>{qr.name}</td>
                              <td>No Result</td>
                              <td>No Result</td>
                            </tr>
                            )}
                            {!_.isEmpty(qr.scores) && qr.scores.map((cs, i) => (
                              <tr>
                                <td>{qr.name}</td>
                                <td>{cs.name}</td>
                                <td>{cs.score}</td>
                                {showRewardsColumn 
                                  && <td>{_.isEmpty(qr.scores) ? 'No Result' : qr.scores[i].rewards.map(r => <img src={r.img} alt={r.name} />)}</td>}
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </Fragment>
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

Questfinder.defaultProps = { };

Questfinder.propTypes = {};

const mapStateToProps = state => ({});

const mapDispatchToProps = dispatch => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Questfinder);
