import java.util.HashSet;

public class Game {
    public static void main(String[] args) {
	// You can add your own tests here if you want to
        // The main method will not be assessed
	System.out.println("This is your own test function");
    }
}


// Write your class definitions here!

class Location {
    private HashSet<GameCharacter> inhabitants = new HashSet<GameCharacter>();

    HashSet<GameCharacter> inhabitants() {
	return inhabitants;
    }
    
    void leave(GameCharacter leaving) {
	inhabitants.remove(leaving);
    }
    
    void enter(GameCharacter entering) {
	inhabitants.add(entering);
    }
}

class GameCharacter {
    private Location location;
    GameCharacter(Location location) {
	this.location = location;
	location.enter(this);
    }
    
    void moveTo(Location newLocation) {
	location.leave(this);
	location = newLocation;
	newLocation.enter(this);
    }
    
    boolean inLocation(Location someLocation) {
	return someLocation == location;
    }
}

class Player extends GameCharacter {
    private int health = 1, defense;
    Player(Location location, int defense) {
	super(location);
	this.defense = defense;
    }
    
    void changeHealth(int change) {
	health = health+change;
	if (health < 0) {
	    health = 0;
	}
    };

    boolean isAlive() {
	return health > 0;
    }
    
    void takeDamage(int damage) {
	if (damage > defense) {
	    health = health - damage + defense;
	    if (health < 0) {
		health = 0;
	    }
	}
    }
}

class Monster extends GameCharacter {
    private int strength;
    Monster(Location location, int strength) {
	super(location);
	this.strength = strength;
    }

    void moveTo(Location newLocation) {
	super.moveTo(newLocation);
	for (GameCharacter player: newLocation.inhabitants()) {
	    if (player instanceof Player) {
		((Player)player).takeDamage(strength);
	    }
	}
    }
}
